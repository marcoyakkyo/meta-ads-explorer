from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import streamlit as st

client = MongoClient(st.secrets["MONGO_DB_URL"])[st.secrets["MONGO_DB_NAME"]]

# {
#   "ad_archive_id": "1947996416031676",
#   "created_at": {
#     "$date": "2025-07-08T16:01:26.058Z"
#   },
#   "full_html_text": "​ActiveLibrary ID: 1947996416031676Started running on 7 Jul 2025 · Total active time 11 hrsPlatforms​​​​​This ad has multiple versions​Open Drop-down​See ad detailsGlowvaniSponsored\"I used to feel so insecure about my dark inner thighs. I tried scrubs, DIY turmeric masks, and nothing worked—until Glowvani.After 2 weeks, I could finally see a difference.It’s gentle enough for intimate areas, packed with turmeric + kojic acid, and doesn’t leave stains or irritation like other soaps.If you’ve tried everything and still feel uncomfortable in your skin… this is the bar everyone’s talking about.\"GLOWVANI.COMNaturally Lighten Dark Inner Thighs in 2–3 Weeks ✨Real results. No harsh chemicals. 30-day money-back guarantee.Shop NowClick to select tags...Add TagSave ad",
#   "img_url": "https://scontent.fcia3-1.fna.fbcdn.net/v/t39.35426-6/516527147_4181958772038273_3026234701252935008_n.jpg?stp=dst-jpg_s60x60_tt6&_nc_cat=101&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=AzmTW8hxfyMQ7kNvwHcJp2Z&_nc_oc=Adl8X0c5AfgZgabkCqhcOnTgxYWms7P6RJm_Q7yUXFQrb-0nWAnieaNScD0T96qo7DE&_nc_zt=14&_nc_ht=scontent.fcia3-1.fna&_nc_gid=WAOgiOdCDQ4pfjP4t58U2A&oh=00_AfT7aP2s5i405YBnJGCutw1t6HYqY-CvdgABy8e9KvrHMg&oe=6872FC81",
#   "query_params": {
#     "active_status": "active",
#     "ad_type": "all",
#     "country": "ALL",
#     "is_targeted_country": "false",
#     "media_type": "all",
#     "search_type": "page",
#     "view_all_page_id": "566562996533315"
#   },
#   "tags": [],
#   "updated_at": {
#     "$date": "2025-07-08T16:01:26.057Z"
#   }
# }

def get_ads(last_fetched_ad_id: ObjectId=None, tags: list=[], limit: int=20, type_ad: str="all") -> list:
    """
    Fetch ads from the MongoDB collection.
    If last_fetched_ad_id is provided, fetch ads after that ID.
    """
    query = {}
    if last_fetched_ad_id:
        query["_id"] = {"$lt": ObjectId(last_fetched_ad_id)}
    if tags:
        query["tags"] = {"$in": tags}
    if type_ad == "video":
        query["video_url"] = {"$exists": True}
    elif type_ad == "image":
        query["img_url"] = {"$exists": True}


    fields = {
        'ad_archive_id': 1,
        'video_url': 1,
        'img_url': 1,
        'poster_url': 1,
        'full_html_text': 1,
        'query_params': 1,
        'tags': 1,
        'created_at': 1,
        'updated_at': 1,
        'snapshot': 1,
        'ai_image_analysis': 1,
        'ai_video_analysis': 1
    }
    ads = list(client["gigi_ads_saved"].find(query, fields).sort("_id", -1).limit(limit))

    # Convert ObjectId to string for JSON compatibility
    for ad in ads:
        ad["_id"] = str(ad["_id"])
    
    print(f"Fetched {len(ads)} ads from MongoDB.")
    return ads


def get_tags() -> list:
    """
    Fetch all unique tags from the ads collection.
    """
    tags = client["gigi_ads_saved"].aggregate([
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags"}},
        {"$project": {"tag": "$_id"}}
    ])
    tags = [tag["tag"] for tag in tags]
    print(f"Fetched {len(tags)} unique tags from MongoDB.")
    return list(set(tags))  # Return unique tags


def get_competitors() -> list:
    return list(client["facebook_competitors"].find(
        {"competitor_id_page": {"$exists": True}},
        {"_id": 0, "page_name": 1, "competitor_id_page": 1}
    ))


def update_ad_tags(ad_archive_id: str, new_tags: list) -> bool:
    """
    Update tags for a specific ad in the database.
    Returns True if successful, False otherwise.
    """
    try:
        client["gigi_ads_saved"].update_one(
            {"ad_archive_id": ad_archive_id},
            {"$set": {"tags": new_tags, "updated_at": datetime.now()}}  # MongoDB will auto-set current date
        )
        print(f"Updated tags for ad {ad_archive_id}: {new_tags}")
        return True
    except Exception as e:
        print(f"Error updating ad tags: {str(e)}")
        return False


