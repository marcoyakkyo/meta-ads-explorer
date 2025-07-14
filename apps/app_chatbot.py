import streamlit as st
from bson.objectid import ObjectId

from src import chatbot_utils, mongo

# ---------------------------- APP INTERFACE ----------------------------
def main():
    st.title("Yakkyofy Experts Interface")

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
**Messages:** {session['num_messages']}
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
            st.chat_message(message["role"]).markdown(message["content"])

    # Place the chat input at the bottom of the page
    if user_input := st.chat_input("What is up?", key="chatbot_input"):

        # Display user message in chat message container
        with chatbot_container:
            st.chat_message("user").markdown(user_input)

        # Update chat history with user input
        chatbot_utils.update_chat("user", user_input, with_image=st.session_state["chatbot_uploaded_image"] is not None)

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
        chatbot_utils.update_chat("assistant", chatbot_message, with_image=st.session_state["chatbot_uploaded_image"] is not None)

        # Display assistant chatbot_message in chat message container
        with chatbot_container:
            st.chat_message("assistant").markdown(chatbot_message)

        if isinstance(intermediate_steps, list):
            st.sidebar.write("Intermediate steps:")
            for step in intermediate_steps:
                st.sidebar.write(step.get("action").get("tool"))
                st.sidebar.write("Input: " + str(step.get("action").get("toolInput")))
