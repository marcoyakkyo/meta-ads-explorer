import os
from dotenv import load_dotenv
import streamlit as st

load_dotenv(override=True)

IS_DEBUG = os.getenv("DEBUG", "").lower() == "true"

CHATBOT_HEADERS = {
    "authorization": st.secrets["password_endpoint"],
    "Content-Type": "application/json"
}

CHATBOT_MODELS = {
    "gpt-4.1": "gpt-4.1",
    "gpt-4.1-mini": "gpt-4.1-mini",
    # finetuned on tool usage + knowledge at final response
    "gpt-4.1-mini + tools + knowledge": "ft:gpt-4.1-mini-2025-04-14:yakkyo-spa:tools-and-knowledge:Bx7yOspD",
    # finetune of Bx7yOspD with also Q&A pairs
    "gpt-4.1-mini + tools + knowledge + Q&A": "ft:gpt-4.1-mini-2025-04-14:yakkyo-spa:tools-and-knowledge-and-q-a:C8lsCilS",
}
