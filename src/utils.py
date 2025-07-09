import streamlit as st


def show_ads(ads: list, num_cols: int = 5):

    st.write("### Ads Data")

    cols = st.columns(num_cols)

    for i, ad in enumerate(ads):
        col = cols[i % num_cols]  # Cycle through columns

        with col:
            col.write(f"Ad ID: {ad['ad_archive_id']}")
            col.write(f"[View on Facebook Ads Library](https://www.facebook.com/ads/library/?id={ad['ad_archive_id']})")

            if ad.get("video_url"):
                col.write(f"[Video URL]({ad['video_url']})")
                if ad.get("poster_url"):
                    col.image(ad.get("poster_url", ""), use_container_width=True, caption="Ad Poster")
            elif ad.get("img_url"):
                col.image(ad.get("img_url"), use_container_width=True, caption="Ad Image")
            else:
                col.write("No image or video available for this ad.")

            col.write(f"Created at: {ad['created_at']}")
            col.write(f"Updated at: {ad['updated_at']}")
            col.write(f"Tags: {', '.join(ad.get('tags', []))}")

            # get pageId from query_params as sub-key view_all_page_id
            page_id = ad.get("query_params", {}).get("view_all_page_id", "N/A")

            col.write(f"page ID: {page_id}")
            if str(page_id) in st.session_state["competitors"]:
                col.write(f"Competitor: {st.session_state['competitors'][str(page_id)]}")

            if 'snapshot' in ad and 'body' in ad['snapshot'] and 'text' in ad['snapshot']['body']:
                ad_body = ad['snapshot']['body']['text'][:150]
            elif ad.get("full_html_text", ""):
                ad_body = ad['full_html_text'][:150]
            else:
                ad_body = "No ad body available."

            col.write(f"Ad body: {ad_body[:150]}...")  # Fallback to ad_body if snapshot is not available
            col.write("---------")  # Separator for each ad

