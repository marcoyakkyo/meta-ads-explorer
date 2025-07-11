import streamlit as st
from time import sleep

from src import auth, utils, config, mongo

PAGE_SIZE = 9
NUM_COLUMNS = 3

# ---------------------------- AUTH CHECKS ----------------------------
if config.IS_DEBUG:
    # skip password check in debug mode
    print("Running in debug mode, skipping password check.")
    st.session_state["password_correct"] = True

elif not auth.check_password():
    print("Password incorrect, stopping the script.")
    st.stop()  # Do not continue if check_password is not True.


def init_data():
    st.session_state["existing_tags"] = mongo.get_tags()
    st.session_state["selected_tags"] = []

    st.session_state["ads_data"] = mongo.get_ads(last_fetched_ad_id=None, limit=PAGE_SIZE)
    st.session_state["last_id"] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None

    st.session_state["competitors"] = mongo.get_competitors()
    st.session_state["competitors"] = {str(c["competitor_id_page"]): c["page_name"] for c in st.session_state["competitors"]}

# ---------------------------- APP INTERFACE ----------------------------
st.title("FB Ads Meta - Saved Ads")

# ---------------------------- INIT DATA ----------------------------
if "ads_data" not in st.session_state:
    init_data()
    st.success("Ads data initialized successfully!")

# ---------------------------- Button update ----------------------------
if st.button("REFRESH Ads Data"):
    init_data()
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

    new_ads = mongo.get_ads(
        last_fetched_ad_id=st.session_state['last_id'], 
        limit=PAGE_SIZE,
        tags=st.session_state["selected_tags"],  # Apply current tag filter
        type=st.session_state.get("ad_type_filter", "all")
    )

    if new_ads:
        # Extend the existing ads data with new ads
        st.session_state["ads_data"].extend(new_ads)
        st.session_state['last_id'] = new_ads[-1]["_id"]

        st.success(f"Loaded {len(new_ads)} more ads.")

        # Add only the new ads to the container (append, don't replace)
        with ads_container:
            utils.show_ads(new_ads, num_cols=NUM_COLUMNS)

    else:
        if st.session_state["selected_tags"]:
            st.info("No more ads found with the selected tags.")
        else:
            st.info("No more ads to load.")


# Display current count of ads
st.sidebar.info(f"Currently displaying {len(st.session_state['ads_data'])} ads")

# ---------------------------- TAG FILTERING SECTION ----------------------------
st.sidebar.header("🏷️ Filter by Tags")

# Multiselect for tag filtering
selected_tags = st.sidebar.multiselect(
    "Select tags to filter ads:",
    options=st.session_state["existing_tags"],
    default=st.session_state["selected_tags"],
    key="tag_filter"
)

# Apply filter button
if st.sidebar.button("Apply Tag Filter", key="apply_filter") and selected_tags:
    # Update selected tags in session state
    st.session_state["selected_tags"] = selected_tags
    
    # Fetch filtered ads
    st.session_state["ads_data"] = mongo.get_ads(
        last_fetched_ad_id=None, 
        limit=PAGE_SIZE, 
        tags=st.session_state["selected_tags"],
        type=st.session_state.get("ad_type_filter", "all")  # Use current type filter
    )
    st.session_state['last_id'] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None

    st.sidebar.success(f"Filtered by {len(st.session_state['selected_tags'])} tag(s)")
    st.rerun()  # Rerun to refresh the display


# Show current filter status
if st.session_state["selected_tags"]:
    st.sidebar.write("**Current filter:**")
    for tag in st.session_state["selected_tags"]:
        st.sidebar.write(f"• {tag}")
else:
    st.sidebar.write("**No filter applied** - showing all ads")

st.sidebar.write("Filter by type (video, image)")

selected_type = st.sidebar.selectbox(
    "Select ad type:",
    options=["All", "Video", "Image"],
    key="ad_type_filter"
)

# Apply type filter
if selected_type != "All":
    st.session_state["ad_type_filter"] = selected_type.lower()

    st.session_state["ads_data"] = mongo.get_ads(
        last_fetched_ad_id=None,
        limit=PAGE_SIZE,
        tags=st.session_state["selected_tags"],
        type=st.session_state["ad_type_filter"]
    )
    st.session_state['last_id'] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None
    st.sidebar.success(f"Filtered by {selected_type} ads")
else:
    st.session_state["ad_type_filter"] = "all"
    st.session_state["ads_data"] = mongo.get_ads(
        last_fetched_ad_id=None,
        limit=PAGE_SIZE,
        tags=st.session_state["selected_tags"]
    )
    st.session_state['last_id'] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None
    st.sidebar.success("Showing all ad types")
# Clear filter button
if st.sidebar.button("Clear Filter", key="clear_filter"):
    st.session_state["selected_tags"] = []
    st.session_state["ads_data"] = mongo.get_ads(last_fetched_ad_id=None, limit=PAGE_SIZE, tags=[])
    st.session_state['last_id'] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None
    st.sidebar.success("Filter cleared - showing all ads")
    st.rerun()  # Rerun to refresh the display
# js = '''
# <script>
#     var body = window.parent.document.querySelector(".main");
#     console.log(body);
#     body.scrollTop = 0;
# </script>
# '''
# import streamlit.components.v1 as components

# if st.button("Back to top"):
#     temp = st.empty()
#     with temp:
#         components.html(js)
#         sleep(1) # To make sure the script can execute before being deleted
#     temp.empty()
