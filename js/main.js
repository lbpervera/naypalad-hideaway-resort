document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "nayPaladBookings";

  const VILLAS = {
    "Perlah Villa": {
      price: 25000,
      image: "images/perlah.jpg",
      maxGuests: 9
    },
    "Coral Villa": {
      price: 21000,
      image: "images/coral.jpg",
      maxGuests: 7
    },
    "Ocean View Villa": {
      price: 18000,
      image: "images/ocean.jpg",
      maxGuests: 6
    },
    "Garden View Villa": {
      price: 16000,
      image: "images/garden.jpg",
      maxGuests: 6
    }
  };

  const money = (value) =>
    `PHP ${Number(value).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

  const getBookings = () =>
    JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");

  const saveBookings = (bookings) =>
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));

  const parseDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (value) => {
    const d = parseDate(value);
    if (!d) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  };

  const calcNights = (checkIn, checkOut, fallback = 1) => {
    const start = parseDate(checkIn);
    const end = parseDate(checkOut);
    if (!start || !end) return Number(fallback) || 1;

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : Number(fallback) || 1;
  };

  const nextBookingId = () => {
    const bookings = getBookings();
    const maxId = bookings.reduce((max, b) => Math.max(max, Number(b.id) || 0), 1000);
    return maxId + 1;
  };

  const getBookingIdFromQuery = () =>
    new URLSearchParams(window.location.search).get("id");

  function updateBookingPreview() {
    const villaSelect = document.getElementById("villa");
    const nightsInput = document.getElementById("nights");
    const checkInInput = document.getElementById("checkin");
    const checkOutInput = document.getElementById("checkout");
    const villaImage = document.getElementById("villaImage");
    const villaName = document.getElementById("villaName");
    const villaRate = document.getElementById("villaRate");
    const totalCost = document.getElementById("totalCost");

    if (!villaSelect || !nightsInput || !villaImage || !villaName || !villaRate || !totalCost) return;

    const villa = VILLAS[villaSelect.value];
    if (!villa) return;

    const nights = calcNights(
      checkInInput ? checkInInput.value : "",
      checkOutInput ? checkOutInput.value : "",
      nightsInput.value
    );

    nightsInput.value = nights;
    villaImage.src = villa.image;
    villaImage.alt = villaSelect.value;
    villaName.textContent = villaSelect.value;
    villaRate.textContent = money(villa.price);
    totalCost.textContent = money(villa.price * nights);
  }

  function handleBookingForm() {
    const form = document.getElementById("bookingForm");
    const villaSelect = document.getElementById("villa");
    const nightsInput = document.getElementById("nights");
    const guestName = document.getElementById("guestName");
    const contactNumber = document.getElementById("contactNumber");
    const guestsInput = document.getElementById("guests");
    const checkin = document.getElementById("checkin");
    const checkout = document.getElementById("checkout");
    
    function setGuestLimit() {
        const villa = VILLAS[villaSelect.value];
        if (!villa || !guestsInput) return;

        guestsInput.max = villa.maxGuests;
        guestsInput.min = 1;

        if (Number(guestsInput.value) > villa.maxGuests) {
            guestsInput.value = villa.maxGuests;
        }

        if (Number(guestsInput.value) < 1 || !guestsInput.value) {
            guestsInput.value = 1;
        }
    }

    if (!form || !villaSelect || !nightsInput || !guestName || !contactNumber || !guestsInput || !checkin || !checkout) return;

    const sync = () => {
        setGuestLimit();
        updateBookingPreview();
    };

    villaSelect.addEventListener("change", sync);
    nightsInput.addEventListener("input", sync);
    checkin.addEventListener("change", sync);
    checkout.addEventListener("change", sync);

    // Get villa from URL
    const params = new URLSearchParams(window.location.search);
    const selectedVilla = params.get("villa");

    if (selectedVilla && villaSelect) {
        villaSelect.value = selectedVilla;
    }
    
    setGuestLimit();
    updateBookingPreview();

    function hasDateConflict(villaName, checkIn, checkOut) {
        const newStart = parseDate(checkIn);
        const newEnd = parseDate(checkOut);

        if (!newStart || !newEnd) return false;

        return getBookings().some((existing) => {
            if (existing.villaName !== villaName) return false;
            if (existing.status === "Cancelled") return false;

            const existingStart = parseDate(existing.checkIn);
            const existingEnd = parseDate(existing.checkOut);

            if (!existingStart || !existingEnd) return false;

            return newStart < existingEnd && newEnd > existingStart;
        });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const villa = VILLAS[villaSelect.value];
      const guests = Number(guestsInput.value) || 1;
      const nights = calcNights(checkin.value, checkout.value, nightsInput.value);

      if (!guestName.value.trim()) return alert("Please enter guest name.");
      if (!contactNumber.value.trim()) return alert("Please enter contact number.");
      if (!checkin.value || !checkout.value) return alert("Please select check-in and check-out dates.");
      if (!villa) return alert("Please choose a villa.");
      if (hasDateConflict(villaSelect.value, checkin.value, checkout.value)) {
        return alert("This villa is already booked for the selected dates. Please choose another date or another villa.");
    }
      if (guests > villa.maxGuests) return alert(`Maximum guests for ${villaSelect.value} is ${villa.maxGuests}.`);

      const booking = {
        id: nextBookingId(),
        guestName: guestName.value.trim(),
        contactNumber: contactNumber.value.trim(),
        villaName: villaSelect.value,
        guests,
        nights,
        checkIn: checkin.value,
        checkOut: checkout.value,
        totalCost: villa.price * nights,
        status: "Active"
      };

      const bookings = getBookings();
      bookings.unshift(booking);
      saveBookings(bookings);

      window.location.href = `booking-details.html?id=${booking.id}`;
    });
  }

  function renderBookingsTable() {
    const tbody = document.getElementById("bookingsTableBody");
    const searchInput = document.getElementById("searchBooking");
    const searchBtn = document.getElementById("searchBtn");

    if (!tbody) return;

    const bookings = getBookings();

    const draw = (list) => {
      if (!list.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="padding:40px; text-align:center;">
              <h3 style="color:#173826; margin-bottom:10px;">No Bookings Yet</h3>
              <p style="color:#777; margin-bottom:20px;">You have not made any reservations.</p>
              <a href="booking.html" class="primary-btn">Book a Villa</a>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = list.map((booking) => {
        const statusClass =
          booking.status === "Cancelled" ? "cancel" :
          booking.status === "Completed" ? "complete" : "active";

        return `
          <tr>
            <td>${booking.id}</td>
            <td>${booking.guestName}</td>
            <td>${booking.villaName}</td>
            <td>${formatDate(booking.checkIn)}</td>
            <td>${formatDate(booking.checkOut)}</td>
            <td>${booking.nights}</td>
            <td>${money(booking.totalCost)}</td>
            <td><span class="status ${statusClass}">${booking.status}</span></td>
            <td><a href="booking-details.html?id=${booking.id}" class="table-btn">View</a></td>
          </tr>
        `;
      }).join("");
    };

    draw(bookings);

    const filter = () => {
      const q = (searchInput?.value || "").trim().toLowerCase();
      const filtered = bookings.filter((b) =>
        String(b.id).includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.villaName.toLowerCase().includes(q)
      );
      draw(filtered);
    };

    if (searchInput) searchInput.addEventListener("input", filter);
    if (searchBtn) searchBtn.addEventListener("click", filter);
  }

  function renderBookingDetails() {
    const bookingIdLabel = document.getElementById("bookingIdLabel");
    const detailTable = document.getElementById("detailTable");
    const detailImage = document.getElementById("detailImage");
    const detailStatus = document.getElementById("detailStatus");
    const detailTotal = document.getElementById("detailTotal");
    const cancelBtn = document.getElementById("cancelBookingBtn");

    if (!bookingIdLabel || !detailTable || !detailImage || !detailStatus || !detailTotal || !cancelBtn) return;

    const bookings = getBookings();
    const id = getBookingIdFromQuery();
    let booking = bookings.find((b) => String(b.id) === String(id)) || bookings[0];

    if (!booking) {
      bookingIdLabel.textContent = "Booking ID : —";
      detailTable.innerHTML = `
        <tr><td colspan="2" style="padding:30px; text-align:center;">No booking found.</td></tr>
      `;
      detailImage.src = "images/hero.jpg";
      detailStatus.className = "status cancel";
      detailStatus.textContent = "No Booking";
      detailTotal.textContent = "PHP 0.00";
      cancelBtn.style.display = "none";
      return;
    }

    const redraw = () => {
      const villa = VILLAS[booking.villaName] || { image: "images/hero.jpg" };

      bookingIdLabel.textContent = `Booking ID : ${booking.id}`;
      detailImage.src = villa.image;
      detailImage.alt = booking.villaName;

      detailTable.innerHTML = `
        <tr><td>Guest Name</td><td>${booking.guestName}</td></tr>
        <tr><td>Contact Number</td><td>${booking.contactNumber}</td></tr>
        <tr><td>Villa</td><td>${booking.villaName}</td></tr>
        <tr><td>Number of Guests</td><td>${booking.guests} Guests</td></tr>
        <tr><td>Number of Nights</td><td>${booking.nights} Nights</td></tr>
        <tr><td>Check-in Date</td><td>${formatDate(booking.checkIn)}</td></tr>
        <tr><td>Check-out Date</td><td>${formatDate(booking.checkOut)}</td></tr>
      `;

      detailTotal.textContent = money(booking.totalCost);

      const statusClass =
        booking.status === "Cancelled" ? "cancel" :
        booking.status === "Completed" ? "complete" : "active";

      detailStatus.className = `status ${statusClass}`;
      detailStatus.textContent = booking.status;

      cancelBtn.style.display = booking.status === "Cancelled" ? "none" : "block";
    };

    redraw();

    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (booking.status === "Cancelled") return;

      const updated = getBookings().map((b) =>
        String(b.id) === String(booking.id) ? { ...b, status: "Cancelled" } : b
      );

      saveBookings(updated);
      booking = updated.find((b) => String(b.id) === String(booking.id)) || booking;
      redraw();
      alert("Booking cancelled.");
    });
  }

  handleBookingForm();
  renderBookingsTable();
  renderBookingDetails();
});