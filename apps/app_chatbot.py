import streamlit as st
from bson.objectid import ObjectId

from src import chatbot_utils, mongo

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

    # ---------------------------- CHATBOT INTERFACE ----------------------------
    # add the link to the workflow
    st.markdown(f"**Url**: [n8n WorkFlow]({st.secrets['chatbot_workflow_url']})")

    # add a button to rest sessionId and chat history
    if st.sidebar.button("New Chat", key="new_chat_button"):
        chatbot_utils.reset_chat()

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
        key="image_uploader_chatbot"
    )

    # Display the uploaded image if available
    if uploaded_image is not None:
        st.image(uploaded_image, caption="Uploaded Image", use_column_width=True)
        st.session_state["chatbot_uploaded_image"] = chatbot_utils.get_image_base64(uploaded_image)

    # Button to clear the uploaded image
    if st.session_state["chatbot_uploaded_image"] is not None:
        if st.button("Clear image", key="chatbot_clear_image"):
            st.session_state["chatbot_uploaded_image"] = None
            st.rerun()

    # Display chat messages from history on app rerun
    with chatbot_container:
        for message in st.session_state["chatbot_messages"]:
            if message['role'] != "tool_calls":
                st.chat_message(message["role"]).markdown(message["content"])

    # Place the chat input at the bottom of the page
    if user_input := st.chat_input("What is up?", key="chatbot_input"):

        with_image = st.session_state["chatbot_uploaded_image"] is not None

        # Display user message in chat message container
        with chatbot_container:
            st.chat_message("user").markdown(user_input)

        # Update chat history with user input
        chatbot_utils.update_chat("user", user_input, with_image=with_image)

        # Prepare request params and body
        params = {"text": user_input, "sessionId": st.session_state["chatbot_sessionId"]}
        body = {}

        # Add image to body if available
        if st.session_state["chatbot_uploaded_image"] is not None:
            body["image"] = st.session_state["chatbot_uploaded_image"]

        # Call chatbot
        chatbot_message, intermediate_steps = chatbot_utils.call_chatbot(
            st.secrets['chatbot_webhook_url'],
            params=params,
            body=body if body else None
        )

        if chatbot_message is None:
            chatbot_message = "Sorry, an error occurred. Please try again refreshing the app."
        else:
            print(f"chatbot_message from chatbot: {chatbot_message} - sessionId: {st.session_state['chatbot_sessionId']}")

        ## Update chat with assistant response
        chatbot_utils.update_chat("assistant", chatbot_message, with_image=with_image)

        messages_tool_calls = []
        if isinstance(intermediate_steps, list):
            with chatbot_container:
                st.sidebar.write("Intermediate steps:")
                for step in intermediate_steps:
                    tool = step.get("action", {}).get("tool", None)
                    tool_input = step.get("action", {}).get("toolInput", None)
                    if tool is not None and tool_input is not None:
                        messages_tool_calls.append({
                            "tool": tool,
                            "toolInput": tool_input
                        })
                        st.chat_input('assistant').markdown(f"Tool: `{tool}`\nInput: `{tool_input}`\n")

        # Display assistant chatbot_message in chat message container
        with chatbot_container:
            st.chat_message("assistant").markdown(chatbot_message)

        if messages_tool_calls:
            chatbot_utils.update_chat(
                "tool_calls",
                messages_tool_calls,
                with_image=with_image
            )

        st.rerun()