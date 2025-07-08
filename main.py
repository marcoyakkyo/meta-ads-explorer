import streamlit as st
from src import auth, utils, config

# ---------------------------- AUTH CHECKS ----------------------------
if config.IS_DEBUG:
    # skip password check in debug mode
    print("Running in debug mode, skipping password check.")
    st.session_state["password_correct"] = True

elif not auth.check_password():
    print("Password incorrect, stopping the script.")
    st.stop()  # Do not continue if check_password is not True.


# ---------------------------- APP INTERFACE ----------------------------
st.title("FB Ads Meta - Saved Ads")
