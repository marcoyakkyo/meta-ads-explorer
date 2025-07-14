import os
from dotenv import load_dotenv
import streamlit as st

load_dotenv(override=True)

IS_DEBUG = os.getenv("DEBUG", "").lower() == "true"

CHATBOT_HEADERS = {"x-access-password": st.secrets["password_endpoint"]}
