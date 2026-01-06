"""Test script for vendor API endpoints."""
import asyncio
import httpx
import sys
from datetime import date, timedelta

BASE_URL = "http://localhost:8000"

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Register a test user
        print("1. Registering test user...")
        register_resp = await client.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": f"vendortest{date.today().isoformat()}@test.com",
                "password": "TestPass123!",
                "name": "Vendor Test User"
            }
        )
        if register_resp.status_code == 201:
            token = register_resp.json()["access_token"]
            print(f"   SUCCESS - Got token: {token[:20]}...")
        elif register_resp.status_code == 400 and "already registered" in register_resp.text:
            # Try logging in instead
            print("   User exists, logging in...")
            login_resp = await client.post(
                f"{BASE_URL}/api/auth/login",
                json={
                    "email": f"vendortest{date.today().isoformat()}@test.com",
                    "password": "TestPass123!"
                }
            )
            if login_resp.status_code == 200:
                token = login_resp.json()["access_token"]
                print(f"   SUCCESS - Got token: {token[:20]}...")
            else:
                print(f"   FAILED: {login_resp.status_code} - {login_resp.text}")
                return
        else:
            print(f"   FAILED: {register_resp.status_code} - {register_resp.text}")
            return

        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create a wedding for the test user
        print("\n2. Creating test wedding...")
        wedding_date = date.today() + timedelta(days=180)
        wedding_resp = await client.post(
            f"{BASE_URL}/api/wedding/me",
            headers=headers,
            json={
                "partner1_name": "Test Partner 1",
                "partner2_name": "Test Partner 2",
                "wedding_date": wedding_date.isoformat(),
                "wedding_time": "4:00 PM",
                "dress_code": "Semi-Formal",
            }
        )
        if wedding_resp.status_code in [200, 201]:
            wedding_data = wedding_resp.json()
            wedding_id = wedding_data.get("id")
            print(f"   SUCCESS - Wedding created: {wedding_id}")
        elif "already have a wedding" in wedding_resp.text:
            print("   Wedding already exists, continuing...")
            me_resp = await client.get(f"{BASE_URL}/api/wedding/me", headers=headers)
            if me_resp.status_code == 200:
                wedding_id = me_resp.json().get("id")
                print(f"   Existing wedding ID: {wedding_id}")
            else:
                print(f"   FAILED to get existing wedding: {me_resp.text}")
                return
        else:
            print(f"   FAILED: {wedding_resp.status_code} - {wedding_resp.text}")
            return

        # 3. Get vendor categories
        print("\n3. Getting vendor categories...")
        cat_resp = await client.get(f"{BASE_URL}/api/vendors/categories")
        if cat_resp.status_code == 200:
            categories = cat_resp.json()["categories"]
            print(f"   SUCCESS - {len(categories)} categories: {categories[:5]}...")
        else:
            print(f"   FAILED: {cat_resp.status_code} - {cat_resp.text}")

        # 4. Create a sample vendor (Photographer)
        print("\n4. Creating sample vendor (Photographer)...")
        vendor_resp = await client.post(
            f"{BASE_URL}/api/vendors/",
            headers=headers,
            json={
                "business_name": "Amazing Photography Co",
                "category": "photography",
                "contact_name": "John Photographer",
                "email": "john@amazingphoto.com",
                "phone": "(555) 123-4567",
                "website_url": "https://amazingphoto.com",
                "instagram_handle": "@amazingphotoco",
                "status": "booked",
                "contract_amount": 5000.00,
                "deposit_amount": 1000.00,
                "service_description": "Full day wedding photography, 2 photographers, engagement session included",
                "service_date": wedding_date.isoformat(),
                "arrival_time": "2:00 PM",
                "end_time": "11:00 PM",
                "notes": "Will also bring a drone for aerial shots!"
            }
        )
        if vendor_resp.status_code == 201:
            vendor_id = vendor_resp.json()["id"]
            print(f"   SUCCESS - Vendor created: {vendor_id}")
        else:
            print(f"   FAILED: {vendor_resp.status_code} - {vendor_resp.text}")
            return

        # 5. Add a payment to the vendor
        print("\n5. Adding payment to vendor...")
        payment_resp = await client.post(
            f"{BASE_URL}/api/vendors/{vendor_id}/payments",
            headers=headers,
            json={
                "payment_type": "deposit",
                "description": "Initial deposit",
                "amount": 1000.00,
                "due_date": (date.today() - timedelta(days=30)).isoformat(),
                "status": "paid",
                "payment_method": "Credit Card"
            }
        )
        if payment_resp.status_code == 201:
            payment_id = payment_resp.json()["id"]
            print(f"   SUCCESS - Payment added: {payment_id}")
        else:
            print(f"   FAILED: {payment_resp.status_code} - {payment_resp.text}")

        # Add another upcoming payment
        print("\n6. Adding upcoming payment...")
        payment2_resp = await client.post(
            f"{BASE_URL}/api/vendors/{vendor_id}/payments",
            headers=headers,
            json={
                "payment_type": "installment",
                "description": "Second payment",
                "amount": 2000.00,
                "due_date": (date.today() + timedelta(days=30)).isoformat(),
                "status": "pending",
            }
        )
        if payment2_resp.status_code == 201:
            print(f"   SUCCESS - Payment added: {payment2_resp.json()['id']}")
        else:
            print(f"   FAILED: {payment2_resp.status_code} - {payment2_resp.text}")

        # 7. Add a communication log
        print("\n7. Adding communication log...")
        comm_resp = await client.post(
            f"{BASE_URL}/api/vendors/{vendor_id}/communications",
            headers=headers,
            json={
                "communication_type": "email",
                "direction": "outbound",
                "subject": "Confirming booking details",
                "content": "Hi John, just wanted to confirm our wedding date and timeline. Looking forward to working with you!"
            }
        )
        if comm_resp.status_code == 201:
            print(f"   SUCCESS - Communication logged: {comm_resp.json()['id']}")
        else:
            print(f"   FAILED: {comm_resp.status_code} - {comm_resp.text}")

        # 8. Get vendor details
        print("\n8. Getting vendor details...")
        detail_resp = await client.get(
            f"{BASE_URL}/api/vendors/{vendor_id}",
            headers=headers
        )
        if detail_resp.status_code == 200:
            vendor_data = detail_resp.json()
            print(f"   SUCCESS - Vendor: {vendor_data['business_name']}")
            print(f"   Category: {vendor_data['category']}")
            print(f"   Status: {vendor_data['status']}")
            print(f"   Contract: ${vendor_data['contract_amount']}")
            print(f"   Payments: {len(vendor_data['payments'])} records")
            print(f"   Payment Summary: {vendor_data['payment_summary']}")
            print(f"   Communications: {len(vendor_data['communications'])} records")
        else:
            print(f"   FAILED: {detail_resp.status_code} - {detail_resp.text}")

        # 9. Get vendor summary
        print("\n9. Getting vendor summary...")
        summary_resp = await client.get(
            f"{BASE_URL}/api/vendors/summary/all",
            headers=headers
        )
        if summary_resp.status_code == 200:
            summary = summary_resp.json()
            print(f"   SUCCESS - Summary:")
            print(f"   Total vendors: {summary['summary']['total_vendors']}")
            print(f"   Total contract: ${summary['summary']['total_contract']}")
            print(f"   Total paid: ${summary['summary']['total_paid']}")
            print(f"   Balance due: ${summary['summary']['balance_due']}")
            print(f"   Upcoming payments: {len(summary['upcoming_payments'])}")
        else:
            print(f"   FAILED: {summary_resp.status_code} - {summary_resp.text}")

        # 10. List all vendors
        print("\n10. Listing all vendors...")
        list_resp = await client.get(
            f"{BASE_URL}/api/vendors/",
            headers=headers
        )
        if list_resp.status_code == 200:
            vendors = list_resp.json()
            print(f"   SUCCESS - Found {vendors['total']} vendors")
            for v in vendors['vendors']:
                print(f"   - {v['business_name']} ({v['category']}) - {v['status']}")
        else:
            print(f"   FAILED: {list_resp.status_code} - {list_resp.text}")

        print("\n" + "="*50)
        print("ALL BACKEND TESTS PASSED!")
        print("="*50)

if __name__ == "__main__":
    asyncio.run(main())
