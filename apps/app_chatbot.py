import streamlit as st
from bson.objectid import ObjectId

from src import config, chatbot_utils, mongo, chat_stream

def main():
    # ---------------------------- Initialize chat session ----------------------------
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

    if "chatbot_model" not in st.session_state:
        st.session_state["chatbot_model"] = st.secrets.get('chatbot_model', 'gpt-4.1-mini' if config.IS_DEBUG else 'gpt-4.1')

    # ---------------------------- CHATBOT INTERFACE ----------------------------
    st.title("Yakkyo Meta ChatBot 🤖")

    # select the model from the sidebar
    selected_model = st.sidebar.selectbox(
        "Select Model",
        options=config.CHATBOT_MODELS.keys(),
        index=0 if not config.IS_DEBUG else 1,
        key="chatbot_model_selectbox"
    )
    st.session_state["chatbot_model"] = config.CHATBOT_MODELS[selected_model]
    st.sidebar.markdown("---")

    ## checkbox to toggle streaming mode
    st.session_state["chatbot_stream"] = st.sidebar.toggle(
        "Streaming Mode",
        value=st.session_state["chatbot_stream"],
        key="toggle_streaming_mode"
    )

    ## button to reset the chat
    if st.sidebar.button("New Chat", key="new_chat_button"):
        chatbot_utils.reset_chat()

    ## display the download chat button
    chatbot_utils.display_download_chat_button()

    ## display chat history in the sidebar
    chatbot_utils.display_old_chats_history()

    ## display tool calls of this chat in the sidebar
    chatbot_utils.display_chat_tools()

    # Create a container for the chat messages
    chatbot_container = st.container()

    # slider to score the current chat from 0 to 5 (only if there are messages)
    if len(st.session_state["chatbot_messages"]) > 0:
        chatbot_utils.insert_slider_score_chat(chatbot_container)

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
            "model": st.session_state["chatbot_model"],
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

        if response:
            if st.session_state.get("chatbot_stream", True):
                messages_tool_calls = chatbot_utils.parse_tool_calls(data.get("messages", []))
                if response.get("messages"):
                    st.session_state["chatbot_messages"].extend(data["messages"])
            else:
                messages_tool_calls = chatbot_utils.parse_tool_calls(response.get("messages", []))
                with chatbot_container:
                    st.chat_message("assistant").markdown(response["messages"][-1]["content"])
                st.session_state["chatbot_messages"].extend(response["messages"])

            if messages_tool_calls:
                st.session_state["chatbot_tool_calls"].extend(messages_tool_calls)
                print(f"Tool calls added to session {len(messages_tool_calls)}:\n{messages_tool_calls}\n")

        else:
            st.session_state["chatbot_messages"].append({
                "role": "assistant",
                "content": "Sorry, an error occurred. Please try again refreshing the app."
            })

            with chatbot_container:
                st.chat_message("assistant").markdown("Sorry, an error occurred. Please try again refreshing the app.")

        st.rerun()
