import streamlit as st

from src import auth, config
from apps import app_ads_visualization, app_chatbot


# ---------------------------- AUTH CHECKS ----------------------------
if config.IS_DEBUG:
    # skip password check in debug mode
    print("Running in debug mode, skipping password check.")
    st.session_state["password_correct"] = True

elif not auth.check_password():
    print("Password incorrect, stopping the script.")
    st.stop()  # Do not continue if check_password is not True.


# ---------------------------- APP INTERFACE ----------------------------
## add a multiselect to choose betwheen ads visualization app and chatbot app
app_options = {
    "FB Saved Ads": app_ads_visualization.main,
    "MCP Chatbot": app_chatbot.main
}

st.selectbox("App:", list(app_options.keys()), index=0, key="app_selector")

## run the selected app
app_options[st.session_state["app_selector"]]()
