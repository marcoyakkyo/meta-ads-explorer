import io
import base64, requests, gc
from typing import Dict, Any, Union, Tuple
from bson.objectid import ObjectId
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import streamlit as st

from src.config import CHATBOT_HEADERS
from src import mongo


def get_image_base64(uploaded_file) -> Union[str, None]:
    if uploaded_file is not None:
        bytes_data = uploaded_file.getvalue()
        base64_encoded = base64.b64encode(bytes_data).decode("utf-8")
        return base64_encoded
    return None


def call_chatbot(url: str, params: Dict[str, Any]=None, body: Dict[str, Any]=None) -> Union[str, None]:

    print(f"Calling {url} with params: {params} and body: {body}")

    try:
        response = requests.post(url, params=params, json=body, headers=CHATBOT_HEADERS)

        if response.status_code != 200:
            print(f"Error calling {url}: {response.status_code} - {response.text[:100]}")
            return None, None
        res = response.json()
        if "output" not in res:
            print(f"Error calling {url}: {res} - NO OUTPUT FOUND")
            return None, None

        return res["output"], res.get("intermediateSteps", None)

    except Exception as e:
        print(f"Error calling {url}: {e}")
        return None, None


def reset_chat() -> None:
    del st.session_state["chatbot_messages"][:]
    st.session_state["chatbot_uploaded_image"] = None
    st.session_state["chatbot_messages"] = []
    st.session_state["chatbot_sessionId"] = str(ObjectId())
    st.session_state["chatbot_history"] = mongo.get_history_chats(limit=20, skip=0)
    st.session_state["chatbot_tool_calls"] = []
    gc.collect()
    return None


def update_chat(role: str, content: str, with_image: bool = False) -> bool:
    msg = {
        "role": role,
        "content": content,
        "with_image": with_image
    }

    st.session_state["chatbot_messages"].append(msg)

    return mongo.update_chatbot_session(
        session_id=st.session_state["chatbot_sessionId"],
        new_message=msg
    )


def set_chat(session_id: str) -> None:
    """
    Load a chat session by its ID and update the session state.
    """
    session = mongo.get_chatbot_session(session_id)
    if session:
        st.session_state["chatbot_messages"] = session.get("messages", [])
        st.session_state["chatbot_sessionId"] = session_id
        st.session_state["chatbot_uploaded_image"] = None

        tool_calls = []
        for msg in session.get("messages", []):
            if msg['role'] != 'tool_calls' or 'content' not in msg or not isinstance(msg['content'], list) or not len(msg['content']):
                continue
            for tool_call in msg.get("content", []):
                tool_calls.append({
                    "tool": tool_call.get("tool", ""),
                    "parameters": tool_call.get("parameters", ""),
                    "result": tool_call.get("result", "")
                })
        st.session_state["chatbot_tool_calls"] = tool_calls

        print(f"Loaded chat session {session_id} with {len(st.session_state['chatbot_messages'])} messages.")
    else:
        # Reset to a new session if not found
        print(f"No chat session found for ID {session_id}. Resetting to a new session.")
        reset_chat()
    return None


def generate_chat_pdf() -> Tuple[bytes, str]:
    """
    Generate a PDF from the current chat session messages.
    Returns the PDF as bytes.
    """
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
    title = f"Chat Conversation - Created At: {mongo_doc['created_at'].strftime('%Y-%m-%d %H:%M:%S')} | Messages: {mongo_doc['num_messages']} | Tool Calls: {mongo_doc['tool_calls']} | Rating: {mongo_doc.get('rating', 'Not Rated')}"
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 20))
    
    # Add session info
    session_info = f"Session ID: {st.session_state.get('chatbot_sessionId', 'Unknown')}"
    story.append(Paragraph(session_info, styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Add messages
    messages = st.session_state.get("chatbot_messages", [])
    
    if not messages:
        story.append(Paragraph("No messages in this conversation.", styles['Normal']))
    else:
        for i, message in enumerate(messages):
            role = message['role'].capitalize()
            
            if message['role'] == 'tool_calls':
                # Show tool calls inline with just the tool names
                tool_calls_content = message.get('content', [])
                if isinstance(tool_calls_content, list) and tool_calls_content:
                    tool_names = []
                    for tool_call in tool_calls_content:
                        tool_name = tool_call.get('tool', 'Unknown Tool')
                        tool_names.append(tool_name)
                    
                    tools_text = f"🔧 <b>Tools used:</b> {', '.join(tool_names)}"
                    story.append(Paragraph(tools_text, tool_inline_style))
                continue
                
            content = message.get('content', '').replace('\n', '<br/>')
            
            # Escape HTML characters
            content = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            content = content.replace('&lt;br/&gt;', '<br/>')  # Keep line breaks
            
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
    
    # Add Tool Calls section
    tool_calls = st.session_state.get("chatbot_tool_calls", [])
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
            tool_info += f"<b>Result:</b> {result}...(truncated for brevity)"
            
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
