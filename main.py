import streamlit as st
from src import auth, utils, config, mongo

PAGE_SIZE = 2
NUM_COLUMNS = 5

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


# ---------------------------- LOAD DATA ----------------------------
if "ads_data" not in st.session_state:
    st.session_state["ads_data"] = mongo.get_ads(last_fetched_ad_id=None, limit=PAGE_SIZE)
    st.session_state['last_id'] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None

if "competitors" not in st.session_state:
    st.session_state["competitors"] = mongo.get_competitors()
    st.session_state["competitors"] = {str(c['competitor_id_page']): c['page_name'] for c in st.session_state["competitors"]}

# ---------------------------- Button update ----------------------------
if st.button("REFRESH Ads Data"):
    st.session_state["ads_data"] = mongo.get_ads(last_fetched_ad_id=None, limit=PAGE_SIZE)
    st.session_state['last_id'] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None
    st.success("Ads data updated successfully!")

# ---------------------------- DISPLAY ADS ----------------------------
# display ads in a table with 4 rows, 5 columns, than ask for 'load more' button
if not st.session_state["ads_data"]:
    st.warning("No ads data available. Please refresh or check your database connection.")
    st.stop()


# Display ads in a table format
ads_container = st.container()
with ads_container:
    utils.show_ads(st.session_state["ads_data"], num_cols=NUM_COLUMNS)

# ---------------------------- LOAD MORE ADS ----------------------------
# Always show the Load More button at the bottom
if st.button("LOAD MORE ADS", key="load_more_button"):

    new_ads = mongo.get_ads(last_fetched_ad_id=st.session_state['last_id'], limit=PAGE_SIZE)

    if new_ads:
        # Extend the existing ads data with new ads
        st.session_state["ads_data"].extend(new_ads)
        # Update the last fetched ad ID
        st.session_state['last_id'] = new_ads[-1]["_id"]

        st.success(f"Loaded {len(new_ads)} more ads.")

        # Add only the new ads to the container (append, don't replace)
        with ads_container:
            utils.show_ads(new_ads, num_cols=NUM_COLUMNS)
    else:
        st.info("No more ads to load.")

# Display current count of ads
st.sidebar.info(f"Currently displaying {len(st.session_state['ads_data'])} ads")
