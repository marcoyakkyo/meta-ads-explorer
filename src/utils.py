import streamlit as st
from src import mongo


def update_ad_tags(ad_archive_id: str, new_tags: list):
    """Update tags for a specific ad in the database"""
    try:
        success = mongo.update_ad_tags(ad_archive_id, new_tags)
        if success:
            st.success(f"Tags updated successfully for ad {ad_archive_id}")
            # Refresh the page to show updated tags
            for ad in st.session_state["ads_data"]:
                if ad["ad_archive_id"] == ad_archive_id:
                    ad["tags"] = new_tags

            # remove the ad if it's tags are not ok with the current selected tags
            if not any(tag in new_tags for tag in st.session_state["selected_tags"]):
                st.session_state["ads_data"] = [ad for ad in st.session_state["ads_data"] if ad["ad_archive_id"] != ad_archive_id]
                st.success(f"Ad {ad_archive_id} removed from view due to tag mismatch.")

            st.rerun()
        else:
            st.error("Failed to update tags")
    except Exception as e:
        st.error(f"Error updating tags: {str(e)}")


def add_new_tag_to_ad(ad_archive_id: str, new_tag: str, current_tags: list):
    """Add a new tag to the global tags list and to the specific ad"""
    try:
        # Add the new tag to the current ad's tags
        updated_tags = current_tags + [new_tag] if new_tag not in current_tags else current_tags

        # Update the ad with the new tags
        success = mongo.update_ad_tags(ad_archive_id, updated_tags)
        
        if success:
            st.success(f"New tag '{new_tag}' added and applied to ad {ad_archive_id}")

            # Update session state with new tag
            for ad in st.session_state["ads_data"]:
                if ad["ad_archive_id"] == ad_archive_id:
                    ad["tags"] = updated_tags

            # remove the ad if it's tags are not ok with the current selected tags
            if not any(tag in updated_tags for tag in st.session_state["selected_tags"]):
                st.session_state["ads_data"] = [ad for ad in st.session_state["ads_data"] if ad["ad_archive_id"] != ad_archive_id]
                st.success(f"Ad {ad_archive_id} removed from view due to tag mismatch.")

            if "existing_tags" in st.session_state and new_tag not in st.session_state["existing_tags"]:
                st.session_state["existing_tags"].append(new_tag)
                st.session_state["existing_tags"] = list(set(st.session_state["existing_tags"]))

            st.rerun()
        else:
            st.error("Failed to add new tag")
    except Exception as e:
        st.error(f"Error adding new tag: {str(e)}")


def show_ads(ads: list, num_cols: int = 3):

    st.write("### Saved Ads Overview")

    cols = st.columns(num_cols)

    for i, ad in enumerate(ads):
        col = cols[i % num_cols]  # Cycle through columns

        with col:
            col.write(f"[Ad ID: {ad['ad_archive_id']}](https://www.facebook.com/ads/library/?id={ad['ad_archive_id']})")

            # ad with video
            if ad.get("video_url"):
                col.write(f"[Video URL]({ad['video_url']})")
                if ad.get("poster_url"):
                    col.image(ad["poster_url"], use_container_width=True, caption="Ad Video Preview")
                else:
                    col.write("No poster image available for this video ad.")
            # ad with image
            elif ad.get("img_url"):
                col.image(ad["img_url"], use_container_width=True, caption="Ad Image")
            # no image or video
            else:
                col.write("No image or video available for this ad.")

            col.write(f"Tags: {', '.join(ad.get('tags', []))}")

            # Expandable details section
            with col.expander("Show Details", expanded=False):
                # get pageId from query_params as sub-key view_all_page_id
                page_id = ad.get("query_params", {}).get("view_all_page_id", "N/A")

                st.write(f"**Page ID:** {page_id}")
                if str(page_id) in st.session_state["competitors"]:
                    st.write(f"**Competitor:** {st.session_state['competitors'][str(page_id)]}")

                if 'snapshot' in ad and 'body' in ad['snapshot'] and 'text' in ad['snapshot']['body']:
                    ad_body = ad['snapshot']['body']['text']
                elif ad.get("full_html_text", ""):
                    ad_body = ad['full_html_text']
                else:
                    ad_body = "No ad body available."

                st.write(f"**Ad body:**")
                st.write(ad_body)

                st.write(f"**Created at:** {ad['created_at']}")
                st.write(f"**Updated at:** {ad['updated_at']}")
                
                # Tag editing section
                st.write("**Edit Tags:**")
                
                # Get current tags and all available tags
                current_tags = ad.get('tags', [])
                all_tags = st.session_state.get("existing_tags", [])
                
                # Multiselect for tag editing
                new_tags = st.multiselect(
                    "Select tags:",
                    options=all_tags,
                    default=current_tags,
                    key=f"tags_{ad['ad_archive_id']}"
                )

                # Update tags button
                if st.button("Update Tags", key=f"update_tags_{ad['ad_archive_id']}"):
                    update_ad_tags(ad['ad_archive_id'], new_tags)

                # Add new tag input
                st.write("**Add New Tag:**")
                new_tag = st.text_input(
                    "New tag name:",
                    key=f"new_tag_{ad['ad_archive_id']}",
                    placeholder="Enter new tag name"
                )

                if st.button("Add New Tag", key=f"add_tag_{ad['ad_archive_id']}"):
                    if new_tag.strip():
                        add_new_tag_to_ad(ad['ad_archive_id'], new_tag.strip(), current_tags)
                    else:
                        st.error("Please enter a valid tag name")

            col.write("---------")  # Separator for each ad
