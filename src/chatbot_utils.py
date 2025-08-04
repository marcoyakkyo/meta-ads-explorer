import io, base64, requests, gc
from typing import Dict, Any, Union, Tuple
from bson.objectid import ObjectId
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from PIL import Image
import streamlit as st

from src.config import CHATBOT_HEADERS
from src import mongo


def get_image_base64(uploaded_file) -> Union[str, None]:
    if uploaded_file is not None:
        bytes_data = uploaded_file.getvalue()
        image = Image.open(io.BytesIO(bytes_data)).convert("RGBA").resize((512, 512))
        with io.BytesIO() as output:
            image.save(output, format="PNG")
            bytes_data = output.getvalue()
        return base64.b64encode(bytes_data).decode('utf-8')
    return None


def call_chatbot(url: str, params: Dict[str, Any]=None, body: Dict[str, Any]=None) -> Union[dict, None]:
    print(f"Calling {url} with params: {params} and body: {body}")
    try:
        response = requests.post(url, params=params, json=body, headers=CHATBOT_HEADERS)

        if response.status_code != 200:
            print(f"Error calling {url}: {response.status_code} - {response.text[:100]}")
            return None

        res = response.json()
        if not res.get("success", False):
            print(f"Error calling {url}: {res}")
            return None
        return res

    except Exception as e:
        print(f"Error calling {url}: {e}")
        return None


def parse_tool_calls(response_messages: list) -> list:
    messages_tool_calls = {}
    for message in response_messages:
        if message['role'] == "assistant" and message.get("tool_calls", None):
            for tool_call in message["tool_calls"]:
                messages_tool_calls[tool_call["id"]] = {
                    "id": tool_call["id"],
                    "tool": tool_call["function"]["name"],
                    "parameters": tool_call["function"]["arguments"],
                    "result": None
                }

        ## now find the tool responses in the messages by id
        if message['role'] == "tool" and message.get("content", None):
            messages_tool_calls[message["tool_call_id"]]["result"] = message.get("content", "")

    return list(filter(lambda x: x["result"] is not None, messages_tool_calls.values()))


def reset_chat() -> None:
    del st.session_state["chatbot_messages"][:]
    del st.session_state["chatbot_tool_calls"][:]
    del st.session_state["chatbot_uploaded_image"]
    gc.collect()

    st.session_state["chatbot_messages"] = []
    st.session_state["chatbot_tool_calls"] = []
    st.session_state["chatbot_uploaded_image"] = None
    st.session_state["chatbot_sessionId"] = str(ObjectId())
    st.session_state["chatbot_history"] = mongo.get_history_chats(limit=20, skip=0)
    print("Chat session reset.")
    return None


def set_chat(session_id: str) -> None:
    session = mongo.get_chatbot_session(session_id)
    if session:
        st.session_state["chatbot_messages"] = session.get("messages", [])
        st.session_state["chatbot_uploaded_image"] = None
        st.session_state["chatbot_sessionId"] = session_id
        st.session_state["chatbot_tool_calls"] = parse_tool_calls(session["messages"])
        st.session_state["chatbot_history"] = mongo.get_history_chats(limit=20, skip=0)
        print(f"Loaded chat session {session_id} with {len(st.session_state['chatbot_messages'])} messages.")
    else:
        # Reset to a new session if not found
        print(f"No chat session found for ID {session_id}. Resetting to a new session.")
        reset_chat()
    return None


def generate_chat_pdf() -> Tuple[bytes, str]:
    # Create a buffer to store the PDF
    buffer = io.BytesIO()
    
    # Create the PDF document
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1*inch, bottomMargin=1*inch)
    
    # Get styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=1,  # Center alignment
        spaceAfter=30,
    )
    
    user_style = ParagraphStyle(
        'UserMessage',
        parent=styles['Normal'],
        fontSize=12,
        leftIndent=20,
        rightIndent=20,
        spaceBefore=12,
        spaceAfter=6,
        textColor='green'
    )
    
    assistant_style = ParagraphStyle(
        'AssistantMessage',
        parent=styles['Normal'],
        fontSize=12,
        leftIndent=20,
        rightIndent=20,
        spaceBefore=6,
        spaceAfter=12,
        textColor='black'
    )
    
    tool_section_style = ParagraphStyle(
        'ToolSection',
        parent=styles['Heading2'],
        fontSize=14,
        alignment=0,
        spaceAfter=15,
        spaceBefore=30,
    )
    
    tool_call_style = ParagraphStyle(
        'ToolCall',
        parent=styles['Normal'],
        fontSize=10,
        leftIndent=30,
        rightIndent=20,
        spaceBefore=8,
        spaceAfter=8,
        textColor='gray'
    )
    
    tool_inline_style = ParagraphStyle(
        'ToolInline',
        parent=styles['Normal'],
        fontSize=11,
        leftIndent=20,
        rightIndent=20,
        spaceBefore=6,
        spaceAfter=6,
        textColor='orange'
    )
    
    # Build the PDF content
    story = []
    
    ## take the creation time from mongo using the session_id
    mongo_doc = mongo.client['gigi_chatbot_sessions'].find_one(
        {"_id": ObjectId(st.session_state["chatbot_sessionId"])},
        {"created_at": 1, "num_messages": 1, "tool_calls": 1, "updated_at": 1, "rating": 1}
    )

    assert mongo_doc is not None, f"Chat session not found in MongoDB: {st.session_state['chatbot_sessionId']}"

    # Add title
    title = f"Chat Conversation - Created At: {mongo_doc['created_at'].strftime('%Y-%m-%d %H:%M:%S')} | Messages: {mongo_doc['num_messages']} | Rating: {mongo_doc.get('rating', 'Not Rated')}"
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 20))
    
    # Add session info
    session_info = f"Session ID: {st.session_state.get('chatbot_sessionId', 'Unknown')}"
    story.append(Paragraph(session_info, styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Add messages
    messages = st.session_state.get("chatbot_messages", [])

    for i, message in enumerate(messages):
        role = message['role'].capitalize()

        if message['role'] == 'tool':
            continue

        elif message['role'] == 'assistant' and not message.get('content') and message.get('tool_calls'):
            tool_names = [tool['function']['name'] for tool in message['tool_calls']]
            tools_text = f"🔧 <b>Tools used:</b> {', '.join(tool_names)}"
            story.append(Paragraph(tools_text, tool_inline_style))
            continue

        image_content = ""
        if role == 'User' and isinstance(message['content'], list):
            content = "\n".join([c['text'] for c in message['content'] if 'text' in c and c.get('type') == 'text'])
            image_content = "Un Image was uploaded by the user" if any(c['type'] != 'text' for c in message['content']) else ""
        else:
            content = message['content']

        content = content.strip().replace('\n', '<br/>')

        # Escape HTML characters
        content = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        content = content.replace('&lt;br/&gt;', '<br/>')  # Keep line breaks    
        content = image_content + content

        # Choose style based on role
        if message['role'] == 'user':
            msg_style = user_style
            role_prefix = f"<b>👤 {role}:</b> "
        else:
            msg_style = assistant_style
            role_prefix = f"<b>🤖 {role}:</b> "

        # Add the message
        full_message = role_prefix + content
        story.append(Paragraph(full_message, msg_style))
        
        # Add space between messages
        if i < len(messages) - 1:
            story.append(Spacer(1, 12))

    # Add Tool Calls DETAILED section
    tool_calls = parse_tool_calls(messages)

    if tool_calls:
        story.append(Spacer(1, 30))
        story.append(Paragraph("🔧 Tool Calls Used in This Conversation", tool_section_style))
        story.append(Spacer(1, 15))
        
        for i, tool_call in enumerate(tool_calls):
            tool_name = tool_call.get('tool', 'Unknown Tool')
            parameters = tool_call.get('parameters', '')
            result = tool_call.get('result', 'No result available')
            
            # Format the tool call information
            tool_info = f"<b>Tool {i+1}: {tool_name}</b><br/>"
            tool_info += f"<b>Parameters:</b> {parameters}<br/>"
            tool_info += f"<b>Result:</b> {result[:100]}...(truncated for brevity)"
            
            story.append(Paragraph(tool_info, tool_call_style))

            # Add space between tool calls
            if i < len(tool_calls) - 1:
                story.append(Spacer(1, 10))
    
    # Build the PDF
    doc.build(story)
    
    # Get the PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    filename = f"chatbot_meta_mcp_{mongo_doc['created_at'].strftime('%Y_%m_%d_at_%H_%M_%S')}_messages_{mongo_doc['num_messages']}.pdf"

    return pdf_bytes, filename
