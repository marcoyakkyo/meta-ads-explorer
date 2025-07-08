import streamlit as st
from pymongo import MongoClient

client = MongoClient(st.secrets["MONGO_DB_URL"])[st.secrets["MONGO_DB_NAME"]]

