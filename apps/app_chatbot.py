import streamlit as st
from bson.objectid import ObjectId

from src import config, chatbot_utils, mongo, chat_stream

# ---------------------------- APP INTERFACE ----------------------------
def main():
    # Initialize chat history
    if "chatbot_messages" not in st.session_state:
        st.session_state["chatbot_messages"] = []

    if "chatbot_sessionId" not in st.session_state:
        st.session_state["chatbot_sessionId"] = str(ObjectId())

    # Initialize image state
    if "chatbot_uploaded_image" not in st.session_state:
        st.session_state["chatbot_uploaded_image"] = None

    if "chatbot_history" not in st.session_state:
        st.session_state["chatbot_history"] = mongo.get_history_chats(limit=20, skip=0)

    if "chatbot_tool_calls" not in st.session_state:
        st.session_state["chatbot_tool_calls"] = []

    if "chatbot_image_uploader_id" not in st.session_state:
        st.session_state["chatbot_image_uploader_id"] = 0

    if "chatbot_stream" not in st.session_state:
        st.session_state["chatbot_stream"] = False

    # ---------------------------- CHATBOT INTERFACE ----------------------------

    # add a checkbox to toggle streaming mode
    if st.sidebar.checkbox("Streaming Mode", value=st.session_state["chatbot_stream"], key="checkbox_streaming_mode"):
        st.session_state["chatbot_stream"] = True
        st.sidebar.success("Streaming Mode Enabled")

    # add a button to rest sessionId and chat history
    if st.sidebar.button("New Chat", key="new_chat_button"):
        chatbot_utils.reset_chat()

    # Add PDF download button in sidebar
    if len(st.session_state["chatbot_messages"]) > 0:
        try:
            pdf_bytes, filename = chatbot_utils.generate_chat_pdf()
            st.sidebar.download_button(
                label="📄 Download Chat as PDF",
                data=pdf_bytes,
                file_name=filename,
                mime="application/pdf",
                key="download_chat_pdf"
            )
        except Exception as e:
            st.sidebar.error(f"Error generating PDF: {str(e)}")
    else:
        st.sidebar.info("Start a conversation to enable PDF download")

    # on the sidebar, show the last chat sessions with a button each to load the session
    with st.sidebar.expander("Chat History", expanded=False):
        if st.session_state["chatbot_history"]:
            for session in st.session_state["chatbot_history"]:
                session_id = str(session["_id"])

                # Render a styled block with a button
                with st.container():
                    col1, col2 = st.columns([4, 1])
                    with col1:
                        st.markdown(f"""\
**Created At:** {session['created_at'].strftime('%Y-%m-%d %H:%M:%S')}  
**Last Updated:** {session['updated_at'].strftime('%Y-%m-%d %H:%M:%S')}  
**Messages:** {session['num_messages']}\n
**Rating:** {session.get('rating', 'Not Rated Yet')}
""")
                    with col2:
                        st.button(
                            "Go",
                            key=f"button_load_session_{session_id}",
                            on_click=lambda session_id: chatbot_utils.set_chat(session_id=session_id),
                            args=(session_id,),
                            use_container_width=True
                        )
                st.write("-------")

            # add a button to load more history chats
            if st.button("Load More History Chats"):
                more_sessions = mongo.get_history_chats(limit=20, skip=len(st.session_state["chatbot_history"]))
                if more_sessions:
                    st.write(f"Loaded {len(more_sessions)} more chat sessions.")
                    st.session_state["chatbot_history"].extend(more_sessions)
                    st.rerun()
                else:
                    st.write("No more chat history available.")
        else:
            st.write("No chat history available.")

    ## create a sidebar expander for the tool calls
    with st.sidebar.expander("Tool Calls", expanded=True):
        if st.session_state["chatbot_tool_calls"]:
            for tool_call in st.session_state["chatbot_tool_calls"]:
                st.markdown(f"**Tool:** {tool_call['tool']}\n**Parameters:** {tool_call['parameters']}\n**Result:** {tool_call['result'][:100]}...")
                st.write("-------")
        else:
            st.write("No tool calls made in this session.")

    # Create a container for the chat messages
    chatbot_container = st.container()

    # add a slider to score the current chat from 0 to 5
    if len(st.session_state["chatbot_messages"]) > 0:
        with chatbot_container:
            current_rating = st.session_state.get(f'chat_rating_{st.session_state["chatbot_sessionId"]}', None)
            current_rating = f"Current Rating: {current_rating}" if current_rating is not None else "No rating yet"
            st.write(f"### Chatbot Conversation - Current Rating: {current_rating}")
            st.slider(
                "### Rate this chat",
                min_value=0,
                max_value=5,
                value=4,
                step=1,
                key=f"slider_chat_rating_{st.session_state['chatbot_sessionId']}",
                on_change=lambda : mongo.update_chat_session_rating(
                    st.session_state["chatbot_sessionId"],
                    st.session_state.get(f"slider_chat_rating_{st.session_state['chatbot_sessionId']}", 4)
                )
            )
            st.write("---")

    # Add image uploader above the chat area
    uploaded_image = st.file_uploader(
        "Upload an image (optional)",
        type=["png", "jpg", "jpeg"],
        key=f"image_uploader_chatbot_{st.session_state['chatbot_image_uploader_id']}",
    )

    # Display the uploaded image if available
    if uploaded_image is not None:
        with chatbot_container:
            st.image(uploaded_image, caption="Uploaded Image")
        st.session_state["chatbot_uploaded_image"] = chatbot_utils.get_image_base64(uploaded_image)

    # Display chat messages from history on app rerun
    with chatbot_container:
        for message in st.session_state["chatbot_messages"]:
            if message['role'] in ["user", "assistant"] and message.get("content") and not message.get("tool_calls"):
                st.chat_message(message["role"]).markdown(message["content"])

    # Place the chat input at the bottom of the page
    if user_input := st.chat_input("What is up?", key="chatbot_input"):

        # Display user message in chat message container
        with chatbot_container:
            st.chat_message("user").markdown(user_input)

        # Add user message to session state
        st.session_state["chatbot_messages"].append({"role": "user", "content": user_input})

        # Prepare request params and body
        body = {
            "user_query": user_input,
            "sessionId": st.session_state["chatbot_sessionId"],
            "is_test_chat": config.IS_DEBUG,
            "model": st.secrets.get('chatbot_model', 'gpt-4.1-mini' if config.IS_DEBUG else 'gpt-4.1'),
        }

        # Add image to body if available
        if st.session_state["chatbot_uploaded_image"] is not None:
            body["image"] = st.session_state.pop("chatbot_uploaded_image")
            st.session_state["chatbot_uploaded_image"] = None
            st.session_state["chatbot_image_uploader_id"] += 1
            uploaded_image.close()


        # Call chatbot
        if st.session_state.get("chatbot_stream", True):
            response, data = chat_stream.call_chatbot_stream(
                st.secrets['chatbot_webhook_url'] + "/stream",
                body=body,
                chatbot_container=chatbot_container
            )
        else:
            response = chatbot_utils.call_chatbot(
                st.secrets['chatbot_webhook_url'],
                body=body
            )

        # parse the tool calls within the response
        if response:
            if not st.session_state.get("chatbot_stream", True):
                # For non-streaming mode, display the assistant message
                with chatbot_container:
                    st.chat_message("assistant").markdown(response["messages"][-1]["content"])
                st.session_state["chatbot_messages"].extend(response["messages"])
                messages_tool_calls = chatbot_utils.parse_tool_calls(response.get("messages", []))
            else:
                # For streaming mode, only add the assistant message to session state
                # (it was already displayed during streaming)
                if response.get("messages"):
                    st.session_state["chatbot_messages"].extend(data["messages"])
                messages_tool_calls = chatbot_utils.parse_tool_calls(data.get("messages", []))
                
            if messages_tool_calls:
                st.session_state["chatbot_tool_calls"].extend(messages_tool_calls)
                print(f"Tool calls added to session {len(messages_tool_calls)}:\n{messages_tool_calls}\n")
            # Only rerun after the full response is processed (not during streaming)
            st.rerun()
        else:
            st.session_state["chatbot_messages"].append({
                "role": "assistant",
                "content": "Sorry, an error occurred. Please try again refreshing the app."
            })
            # Display assistant chatbot_message in chat message container
            with chatbot_container:
                st.chat_message("assistant").markdown("Sorry, an error occurred. Please try again refreshing the app.")
            st.rerun()
