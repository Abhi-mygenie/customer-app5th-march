"""Seed default content for all restaurants."""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.environ.get('MONGO_URL'))
db = client[os.environ.get('DB_NAME')]

DEFAULT_ABOUT_IMAGE = "https://images.unsplash.com/photo-1541856644905-bd40b138cbbd?w=1200&q=80"

DEFAULT_ABOUT_CONTENT = """<h2>Our Story</h2>
<p>Welcome to our restaurant! We are passionate about serving delicious, freshly prepared meals that bring people together. Our journey began with a simple idea — great food, warm hospitality, and a welcoming atmosphere.</p>
<p>Every dish on our menu is crafted with care using the finest ingredients sourced from local suppliers. We believe that food is more than just sustenance — it's an experience that creates lasting memories.</p>
<h2>Our Mission</h2>
<p>To deliver exceptional dining experiences through quality food, outstanding service, and a commitment to our community. We strive to make every visit special, whether you're dining in or ordering from the comfort of your home.</p>
<h2>Our Values</h2>
<ul>
<li><strong>Quality</strong> — We never compromise on ingredient quality</li>
<li><strong>Freshness</strong> — Every dish is prepared fresh to order</li>
<li><strong>Service</strong> — Customer satisfaction is our top priority</li>
<li><strong>Community</strong> — We support local farmers and suppliers</li>
</ul>"""

DEFAULT_OPENING_HOURS = """<table>
<tr><td><strong>Monday - Friday</strong></td><td>10:00 AM - 10:00 PM</td></tr>
<tr><td><strong>Saturday</strong></td><td>10:00 AM - 11:00 PM</td></tr>
<tr><td><strong>Sunday</strong></td><td>11:00 AM - 9:00 PM</td></tr>
</table>"""

DEFAULT_FOOTER_TEXT = "All rights reserved."

DEFAULT_FEEDBACK_INTRO = "We value your opinion! Share your dining experience with us and help us serve you better."

DEFAULT_NAV = [
    {"id": "home", "label": "Home", "type": "builtin", "visible": True},
    {"id": "menu", "label": "Menu", "type": "builtin", "visible": True},
    {"id": "about", "label": "About Us", "type": "builtin", "visible": True},
    {"id": "contact", "label": "Contact", "type": "builtin", "visible": True},
    {"id": "feedback", "label": "Feedback", "type": "builtin", "visible": True},
]

def seed_defaults():
    # Get all restaurant users
    users = list(db.users.find({"type": {"$in": ["restaurant", None]}}, {"_id": 0, "email": 1, "id": 1, "restaurant_name": 1}))
    print(f"Found {len(users)} restaurant users")

    for user in users:
        rid = user.get("id", "")
        name = user.get("restaurant_name", "Restaurant")
        
        # Check if config exists
        existing = db.customer_app_config.find_one({"restaurant_id": rid})
        
        update_fields = {}
        
        # Only set fields that don't already have values
        if not existing or not existing.get("aboutUsContent"):
            update_fields["aboutUsContent"] = DEFAULT_ABOUT_CONTENT
        if not existing or not existing.get("aboutUsImage"):
            update_fields["aboutUsImage"] = DEFAULT_ABOUT_IMAGE
        if not existing or not existing.get("openingHours"):
            update_fields["openingHours"] = DEFAULT_OPENING_HOURS
        if not existing or not existing.get("footerText"):
            update_fields["footerText"] = f"{name}. {DEFAULT_FOOTER_TEXT}"
        if not existing or not existing.get("feedbackIntroText"):
            update_fields["feedbackIntroText"] = DEFAULT_FEEDBACK_INTRO
        if not existing or existing.get("feedbackEnabled") is None:
            update_fields["feedbackEnabled"] = True
        if not existing or not existing.get("navMenuOrder"):
            update_fields["navMenuOrder"] = DEFAULT_NAV
        if not existing or not existing.get("address"):
            update_fields["address"] = ""
        if not existing or not existing.get("contactEmail"):
            update_fields["contactEmail"] = user.get("email", "")
        
        if update_fields:
            db.customer_app_config.update_one(
                {"restaurant_id": rid},
                {"$set": update_fields, "$setOnInsert": {"restaurant_id": rid}},
                upsert=True
            )
            print(f"  Seeded defaults for: {name} ({rid})")
        else:
            print(f"  Skipped (already has content): {name} ({rid})")

    print("\nDone!")

if __name__ == "__main__":
    seed_defaults()
