"""
Seed/Demo data for Procureflow prototype.
Safe to run multiple times - checks for existing data before inserting.
"""
import random
from datetime import date, timedelta, datetime
from app.core.database import SessionLocal, engine
from app.core.database import Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole, FarmerProfile, FarmerCrop
from app.models.centre import ProcurementCentre, ProcurementCounter
from app.models.slot import Slot, Booking, QueueEntry, SlotStatus, BookingStatus, QueueStatus
from app.models.procurement import Procurement, Payment, ProcurementStage, PaymentStatus
from app.models.notification import Notification
from app.models.audit import AuditLog

# Import all models to ensure they are registered
import app.models


def seed_database():
    print("🌱 Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        _seed_demo_users(db)
        _seed_centres(db)
        _seed_counters(db)
        _seed_slots(db)
        _seed_demo_bookings(db)
        print("✅ Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding error: {e}")
        raise
    finally:
        db.close()


def _seed_demo_users(db):
    """Create demo accounts if they don't exist."""
    demo_users = [
        {
            "email": "farmer@demo.com",
            "mobile": "9876543210",
            "password": "farmer123",
            "role": UserRole.FARMER,
            "full_name": "Ramesh Kumar",
            "village": "Dhanora",
            "district": "Raipur",
            "state": "Chhattisgarh"
        },
        {
            "email": "operator@demo.com",
            "mobile": "9876543211",
            "password": "operator123",
            "role": UserRole.CENTRE_OPERATOR,
            "full_name": "Suresh Operator"
        },
        {
            "email": "officer@demo.com",
            "mobile": "9876543212",
            "password": "officer123",
            "role": UserRole.GOVERNMENT_OFFICER,
            "full_name": "Priya Officer"
        },
        {
            "email": "admin@procureflow.com",
            "mobile": "9876543299",
            "password": "admin@123",
            "role": UserRole.ADMIN,
            "full_name": "System Admin"
        },
    ]

    for u_data in demo_users:
        existing = db.query(User).filter(User.email == u_data["email"]).first()
        if not existing:
            user = User(
                email=u_data["email"],
                mobile=u_data.get("mobile"),
                hashed_password=get_password_hash(u_data["password"]),
                role=u_data["role"],
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.flush()

            if u_data["role"] == UserRole.FARMER:
                profile = FarmerProfile(
                    user_id=user.id,
                    full_name=u_data["full_name"],
                    mobile=u_data.get("mobile"),
                    email=u_data["email"],
                    village=u_data.get("village"),
                    district=u_data.get("district"),
                    state=u_data.get("state"),
                    kyc_verified=True,
                    kyc_method="normal"
                )
                db.add(profile)
                db.flush()

                # Add crops to demo farmer
                crops = [
                    FarmerCrop(farmer_id=profile.id, crop_name="Wheat", crop_type="Rabi", quantity_quintals=45.0, season="Rabi 2025-26", year=2026),
                    FarmerCrop(farmer_id=profile.id, crop_name="Rice", crop_type="Kharif", quantity_quintals=30.0, season="Kharif 2025", year=2025),
                    FarmerCrop(farmer_id=profile.id, crop_name="Maize", crop_type="Kharif", quantity_quintals=20.0, season="Kharif 2025", year=2025),
                ]
                for c in crops:
                    db.add(c)

            db.commit()
            print(f"  ✓ Created user: {u_data['email']} ({u_data['role']})")
        else:
            print(f"  · User exists: {u_data['email']}")

    # Create additional demo farmers
    extra_farmers = [
        {"name": "Vikram Singh", "mobile": "9811111111", "email": "vikram@demo.com", "village": "Bhilai", "district": "Durg", "state": "Chhattisgarh"},
        {"name": "Sunita Devi", "mobile": "9822222222", "email": "sunita@demo.com", "village": "Rajnandgaon", "district": "Rajnandgaon", "state": "Chhattisgarh"},
        {"name": "Mohan Patel", "mobile": "9833333333", "email": "mohan@demo.com", "village": "Bilaspur", "district": "Bilaspur", "state": "Chhattisgarh"},
        {"name": "Kavita Sharma", "mobile": "9844444444", "email": "kavita@demo.com", "village": "Jagdalpur", "district": "Bastar", "state": "Chhattisgarh"},
        {"name": "Raju Yadav", "mobile": "9855555555", "email": "raju@demo.com", "village": "Korba", "district": "Korba", "state": "Chhattisgarh"},
    ]

    for f in extra_farmers:
        existing = db.query(User).filter(User.email == f["email"]).first()
        if not existing:
            user = User(
                email=f["email"],
                mobile=f["mobile"],
                hashed_password=get_password_hash("demo1234"),
                role=UserRole.FARMER,
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.flush()
            profile = FarmerProfile(
                user_id=user.id,
                full_name=f["name"],
                mobile=f["mobile"],
                email=f["email"],
                village=f["village"],
                district=f["district"],
                state=f["state"],
                kyc_verified=True,
                kyc_method="normal"
            )
            db.add(profile)
            db.flush()
            crop = FarmerCrop(
                farmer_id=profile.id,
                crop_name=random.choice(["Wheat", "Rice", "Maize", "Soybean"]),
                crop_type="Rabi",
                quantity_quintals=random.uniform(10, 60),
                season="Rabi 2025-26",
                year=2026
            )
            db.add(crop)
            db.commit()


def _seed_centres(db):
    """Create procurement centres."""
    centres_data = [
        {
            "name": "Raipur Central Procurement Centre",
            "code": "RPC001",
            "address": "Near Mandi Gate, Raipur",
            "village": "Raipur",
            "district": "Raipur",
            "state": "Chhattisgarh",
            "contact_phone": "07712-234567",
            "latitude": 21.2514,
            "longitude": 81.6296,
            "avg_service_time_minutes": 12
        },
        {
            "name": "Durg District Procurement Centre",
            "code": "DPC001",
            "address": "Agricultural Market, Durg",
            "village": "Durg",
            "district": "Durg",
            "state": "Chhattisgarh",
            "contact_phone": "0788-456789",
            "latitude": 21.1904,
            "longitude": 81.2849,
            "avg_service_time_minutes": 15
        },
        {
            "name": "Bilaspur Grain Collection Centre",
            "code": "BGC001",
            "address": "Grain Market Road, Bilaspur",
            "village": "Bilaspur",
            "district": "Bilaspur",
            "state": "Chhattisgarh",
            "contact_phone": "07752-567890",
            "latitude": 22.0797,
            "longitude": 82.1409,
            "avg_service_time_minutes": 10
        }
    ]

    for c_data in centres_data:
        existing = db.query(ProcurementCentre).filter(
            ProcurementCentre.code == c_data["code"]
        ).first()
        if not existing:
            centre = ProcurementCentre(**c_data, is_active=True, total_capacity=150)
            db.add(centre)
            db.commit()
            print(f"  ✓ Created centre: {c_data['name']}")
        else:
            print(f"  · Centre exists: {c_data['code']}")


def _seed_counters(db):
    """Create counters for each centre."""
    centres = db.query(ProcurementCentre).all()
    operator_user = db.query(User).filter(User.email == "operator@demo.com").first()

    for centre in centres:
        existing = db.query(ProcurementCounter).filter(
            ProcurementCounter.centre_id == centre.id
        ).first()
        if not existing:
            for i in range(1, 4):  # 3 counters per centre
                counter = ProcurementCounter(
                    centre_id=centre.id,
                    counter_number=i,
                    counter_name=f"Counter {i}",
                    operator_user_id=operator_user.id if (i == 1 and operator_user) else None,
                    is_active=True,
                    is_open=(i <= 2)  # 2 open counters by default
                )
                db.add(counter)
            db.commit()
            print(f"  ✓ Created counters for: {centre.name}")


def _seed_slots(db):
    """Create slots for the next 14 days for each centre."""
    centres = db.query(ProcurementCentre).all()
    today = date.today()

    slot_templates = [
        {"start": "08:00", "end": "10:00", "label": "Morning", "capacity": 25},
        {"start": "10:00", "end": "12:00", "label": "Late Morning", "capacity": 25},
        {"start": "14:00", "end": "16:00", "label": "Afternoon", "capacity": 20},
        {"start": "16:00", "end": "18:00", "label": "Late Afternoon", "capacity": 20},
    ]

    for centre in centres:
        for day_offset in range(0, 14):
            slot_date = today + timedelta(days=day_offset)
            for template in slot_templates:
                existing = db.query(Slot).filter(
                    Slot.centre_id == centre.id,
                    Slot.slot_date == slot_date,
                    Slot.slot_start_time == template["start"]
                ).first()
                if not existing:
                    # Vary crowd: yesterday/today slots are more booked
                    base_booked = random.randint(0, template["capacity"] - 5) if day_offset > 1 else random.randint(5, template["capacity"] - 2)
                    status = SlotStatus.FULL if base_booked >= template["capacity"] else SlotStatus.AVAILABLE
                    slot = Slot(
                        centre_id=centre.id,
                        slot_date=slot_date,
                        slot_start_time=template["start"],
                        slot_end_time=template["end"],
                        slot_label=template["label"],
                        max_capacity=template["capacity"],
                        booked_count=base_booked,
                        status=status,
                        is_active=True
                    )
                    db.add(slot)
        db.commit()
    print(f"  ✓ Created slots for {len(centres)} centres over 14 days")


def _seed_demo_bookings(db):
    """Create some demo bookings and procurement states for realistic data."""
    today = date.today()

    # Get the main demo farmer
    demo_farmer_user = db.query(User).filter(User.email == "farmer@demo.com").first()
    if not demo_farmer_user or not demo_farmer_user.farmer_profile:
        return

    # Check if demo farmer already has a booking
    existing_booking = db.query(Booking).filter(
        Booking.farmer_id == demo_farmer_user.farmer_profile.id
    ).first()
    if existing_booking:
        print("  · Demo bookings already exist")
        return

    # Create a confirmed booking for today for the demo farmer
    raipur_centre = db.query(ProcurementCentre).filter(ProcurementCentre.code == "RPC001").first()
    if not raipur_centre:
        return

    today_slot = db.query(Slot).filter(
        Slot.centre_id == raipur_centre.id,
        Slot.slot_date == today,
        Slot.slot_start_time == "10:00"
    ).first()

    if not today_slot:
        return

    demo_crop = db.query(FarmerCrop).filter(
        FarmerCrop.farmer_id == demo_farmer_user.farmer_profile.id
    ).first()

    booking = Booking(
        farmer_id=demo_farmer_user.farmer_profile.id,
        slot_id=today_slot.id,
        crop_id=demo_crop.id if demo_crop else None,
        token_number="PF100001",
        quantity_quintals=45.0,
        status=BookingStatus.CONFIRMED,
        qr_data=f"PROCUREFLOW|TOKEN:PF100001|CENTRE:{raipur_centre.id}|DATE:{today}|FARMER:Ramesh Kumar"
    )
    db.add(booking)
    today_slot.booked_count = min(today_slot.booked_count + 1, today_slot.max_capacity)
    db.flush()

    # Queue entry
    queue_entry = QueueEntry(
        booking_id=booking.id,
        centre_id=raipur_centre.id,
        position=1,
        status=QueueStatus.WAITING,
        estimated_wait_minutes=0
    )
    db.add(queue_entry)
    db.commit()

    # Create some completed procurements for other farmers (for dashboard stats)
    extra_farmers = db.query(FarmerProfile).filter(
        FarmerProfile.user_id != demo_farmer_user.id
    ).limit(5).all()

    crops = ["Wheat", "Rice", "Maize", "Soybean", "Wheat"]
    msps = [2275.0, 2300.0, 1870.0, 4600.0, 2275.0]

    for idx, farmer_profile in enumerate(extra_farmers):
        # Find a past slot
        past_date = today - timedelta(days=idx + 1)
        past_slot = db.query(Slot).filter(
            Slot.centre_id == raipur_centre.id,
            Slot.slot_date == past_date
        ).first()

        if not past_slot:
            continue

        token = f"PF2000{idx+1:02d}"
        if db.query(Booking).filter(Booking.token_number == token).first():
            continue

        b = Booking(
            farmer_id=farmer_profile.id,
            slot_id=past_slot.id,
            token_number=token,
            quantity_quintals=random.uniform(15, 55),
            status=BookingStatus.COMPLETED,
            qr_data=f"PROCUREFLOW|TOKEN:{token}|CENTRE:{raipur_centre.id}|DATE:{past_date}|FARMER:{farmer_profile.full_name}"
        )
        db.add(b)
        db.flush()

        q = QueueEntry(
            booking_id=b.id,
            centre_id=raipur_centre.id,
            position=idx + 2,
            status=QueueStatus.COMPLETED,
            estimated_wait_minutes=random.randint(5, 40)
        )
        db.add(q)
        db.flush()

        net_w = round(random.uniform(14, 50), 2)
        msp = msps[idx]
        total = round(net_w * msp, 2)

        p = Procurement(
            booking_id=b.id,
            centre_id=raipur_centre.id,
            farmer_id=farmer_profile.id,
            crop_name=crops[idx],
            gross_weight=net_w + random.uniform(0.5, 2.0),
            net_weight=net_w,
            moisture_percent=round(random.uniform(10, 18), 1),
            quality_grade=random.choice(["A", "B", "A"]),
            msp_per_quintal=msp,
            total_amount=total,
            stage=ProcurementStage.PAYMENT_COMPLETED,
            arrived_at=datetime.utcnow() - timedelta(days=idx + 1, hours=3),
            weighing_started_at=datetime.utcnow() - timedelta(days=idx + 1, hours=2, minutes=30),
            weighing_completed_at=datetime.utcnow() - timedelta(days=idx + 1, hours=2),
            quality_started_at=datetime.utcnow() - timedelta(days=idx + 1, hours=1, minutes=45),
            quality_completed_at=datetime.utcnow() - timedelta(days=idx + 1, hours=1, minutes=30),
            procurement_completed_at=datetime.utcnow() - timedelta(days=idx + 1, hours=1)
        )
        db.add(p)
        db.flush()

        pay = Payment(
            procurement_id=p.id,
            farmer_id=farmer_profile.id,
            amount=total,
            payment_mode="NEFT",
            bank_account_masked="XXXX1234",
            transaction_reference=f"TXN{random.randint(100000, 999999)}",
            status=PaymentStatus.COMPLETED,
            initiated_at=datetime.utcnow() - timedelta(days=idx + 1),
            completed_at=datetime.utcnow() - timedelta(days=idx, hours=2)
        )
        db.add(pay)
        db.commit()

    print("  ✓ Created demo bookings and procurements")


if __name__ == "__main__":
    seed_database()
