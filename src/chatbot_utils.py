import base64, requests, gc
from time import time
from typing import Dict, Any, Union
from bson.objectid import ObjectId
import streamlit as st

from src.config import CHATBOT_HEADERS
from src import mongo


def get_image_base64(uploaded_file) -> Union[str, None]:
    if uploaded_file is not None:
        bytes_data = uploaded_file.getvalue()
        base64_encoded = base64.b64encode(bytes_data).decode("utf-8")
        return base64_encoded
    return None


def call_chatbot(url: str, params: Dict[str, Any]={}, body: Dict[str, Any]=None) -> Union[str, None]:

    print(f"Calling {url} with params: {params} and body: {body}")

    try:
        response = requests.get(url, params=params, json=body, headers=CHATBOT_HEADERS)

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
                    "result": ""
                })
        st.session_state["chatbot_tool_calls"] = tool_calls

        print(f"Loaded chat session {session_id} with {len(st.session_state['chatbot_messages'])} messages.")
    else:
        # Reset to a new session if not found
        print(f"No chat session found for ID {session_id}. Resetting to a new session.")
        reset_chat()
    return None
