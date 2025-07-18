import streamlit as st
from time import sleep

from src import visualization_utils, mongo

PAGE_SIZE = 9
NUM_COLUMNS = 3

def init_data():
    st.session_state["existing_tags"] = mongo.get_tags()
    st.session_state["selected_tags"] = []
    st.session_state["ad_type_filter"] = "all"

    st.session_state["ads_data"] = mongo.get_ads(last_fetched_ad_id=None, limit=PAGE_SIZE)
    st.session_state["last_id"] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None

    st.session_state["competitors"] = mongo.get_competitors()
    st.session_state["competitors"] = {str(c["competitor_id_page"]): c["page_name"] for c in st.session_state["competitors"]}


def main():
    # ---------------------------- APP INTERFACE ----------------------------
    st.title("FB Ads Meta - Saved Ads")

    # ---------------------------- INIT DATA ----------------------------
    if "ads_data" not in st.session_state:
        init_data()

    # ---------------------------- Button update ----------------------------
    if st.button("REFRESH Ads Data"):
        init_data()
        tmp = st.empty()
        tmp.success("Ads data updated successfully!", icon="✅")
        sleep(0.5)
        tmp.empty()
        st.rerun()


    # ---------------------------- DISPLAY ADS ----------------------------
    # display ads in a table with 4 rows, 5 columns, than ask for 'load more' button
    if not st.session_state["ads_data"]:
        st.warning("No ads data available. Please refresh or check your database connection.")
        st.stop()


    # Display ads in a table format
    ads_container = st.container()
    with ads_container:
        visualization_utils.show_ads(st.session_state["ads_data"], num_cols=NUM_COLUMNS)

    # ---------------------------- LOAD MORE ADS ----------------------------
    # Always show the Load More button at the bottom
    if st.button("LOAD MORE ADS", key="load_more_button"):

        new_ads = mongo.get_ads(
            last_fetched_ad_id=st.session_state['last_id'], 
            limit=PAGE_SIZE,
            tags=st.session_state["selected_tags"],  # Apply current tag filter
            type_ad=st.session_state.get("ad_type_filter", "all")
        )

        if new_ads:
            # Extend the existing ads data with new ads
            st.session_state["ads_data"].extend(new_ads)
            st.session_state['last_id'] = new_ads[-1]["_id"]

            st.success(f"Loaded {len(new_ads)} more ads.")

            # Add only the new ads to the container (append, don't replace)
            with ads_container:
                visualization_utils.show_ads(new_ads, num_cols=NUM_COLUMNS)

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

    selected_type = st.sidebar.selectbox(
        "Select ad type to filter:",
        options=["All", "Video", "Image"],
        index=0,  # Default to "All"
        key="ad_type_filter_type"
    )


    # Apply filter button
    if st.sidebar.button("Apply Filters", key="apply_filter"):
        st.session_state["selected_tags"] = selected_tags
        st.session_state["ad_type_filter"] = selected_type.lower()

        st.session_state["ads_data"] = mongo.get_ads(
            last_fetched_ad_id=None, 
            limit=PAGE_SIZE, 
            tags=st.session_state["selected_tags"],
            type_ad=st.session_state.get("ad_type_filter", "all")  # Use current type filter
        )
        st.session_state['last_id'] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None

        st.sidebar.success(f"Filters applied - showing {len(st.session_state['ads_data'])} ads")
        st.rerun()  # Rerun to refresh the display


    # Show current filter status
    if st.session_state["selected_tags"] or st.session_state.get("ad_type_filter", "all") != "all":
        st.sidebar.write("**Current filters:**")
        for tag in st.session_state["selected_tags"]:
            st.sidebar.write(f"• {tag}")
        st.sidebar.write(f"• Type: {st.session_state['ad_type_filter'].capitalize()}")
    else:
        st.sidebar.write("**No filter applied** - showing all ads")


    # Clear filter button
    if st.sidebar.button("Clear Filters", key="clear_filter"):
        st.session_state["selected_tags"] = []
        st.session_state["ad_type_filter"] = "all"

        st.session_state["ads_data"] = mongo.get_ads(last_fetched_ad_id=None, limit=PAGE_SIZE, tags=[])
        st.session_state["existing_tags"] = mongo.get_tags()  # Refresh existing tags

        st.session_state['last_id'] = st.session_state["ads_data"][-1]["_id"] if st.session_state["ads_data"] else None
        st.sidebar.success("Filter cleared - showing all ads")
        st.rerun()  # Rerun to refresh the display
