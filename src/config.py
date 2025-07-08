import os
from dotenv import load_dotenv
import streamlit as st

load_dotenv(override=True)

IS_DEBUG = os.getenv("DEBUG", "").lower() == "true"
