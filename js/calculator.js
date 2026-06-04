(function () {
  "use strict";

  const API_KEY = window.GOOGLE_MAPS_API_KEY;
  const MIN_CHARGE = 12.99;

  const RATES = {
    baseFee: 8.5,
    perKm: 0.42,
    perKg: 1.85,
    dimensionalDivisor: 5000,
  };

  let mapsLoaded = false;
  let autocompleteFrom = null;
  let autocompleteTo = null;
  let distanceMatrixService = null;
  let map = null;

  const form = document.getElementById("shipping-form");
  const calculateBtn = document.getElementById("calculate-btn");
  const errorEl = document.getElementById("error-message");
  const apiNotice = document.getElementById("api-notice");
  const resultPlaceholder = document.getElementById("result-placeholder");
  const resultContent = document.getElementById("result-content");
  const totalCostEl = document.getElementById("total-cost");
  const breakdownList = document.getElementById("breakdown-list");
  const mapPreview = document.getElementById("map-preview");

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add("visible");
  }

  function hideError() {
    errorEl.classList.remove("visible");
  }

  function formatCurrency(amount) {
    return amount.toFixed(2);
  }

  function calculateDimensionalWeight(height, width, depth) {
    return (height * width * depth) / RATES.dimensionalDivisor;
  }

  function calculateShippingCost(distanceKm, actualWeight, height, width, depth) {
    const dimensionalWeight = calculateDimensionalWeight(height, width, depth);
    const billableWeight = Math.max(actualWeight, dimensionalWeight);

    const baseCharge = RATES.baseFee;
    const distanceCharge = distanceKm * RATES.perKm;
    const weightCharge = billableWeight * RATES.perKg;

    let subtotal = baseCharge + distanceCharge + weightCharge;
    subtotal = Math.max(subtotal, MIN_CHARGE);

    const fuelSurcharge = subtotal * 0.08;
    const total = subtotal + fuelSurcharge;

    return {
      baseCharge,
      distanceCharge,
      weightCharge,
      fuelSurcharge,
      subtotal,
      total,
      billableWeight,
      dimensionalWeight,
      actualWeight,
      distanceKm,
    };
  }

  function renderBreakdown(data) {
    const items = [
      ["Distance (driving)", `${data.distanceKm.toFixed(1)} km`],
      ["Base handling fee", `$${formatCurrency(data.baseCharge)}`],
      ["Distance charge", `$${formatCurrency(data.distanceCharge)}`],
      [
        "Weight charge",
        `$${formatCurrency(data.weightCharge)} (${data.billableWeight.toFixed(1)} kg billable)`,
      ],
      ["Subtotal", `$${formatCurrency(data.subtotal)}`],
      ["Fuel surcharge (8%)", `$${formatCurrency(data.fuelSurcharge)}`],
    ];

    if (data.dimensionalWeight > data.actualWeight) {
      items.splice(3, 0, [
        "Dimensional weight applied",
        `${data.dimensionalWeight.toFixed(1)} kg (vs ${data.actualWeight.toFixed(1)} kg actual)`,
      ]);
    }

    breakdownList.innerHTML = items
      .map(
        ([label, value]) =>
          `<li><span>${label}</span><span>${value}</span></li>`
      )
      .join("");
  }

  function showResult(costData) {
    resultPlaceholder.style.display = "none";
    resultContent.classList.add("visible");
    totalCostEl.textContent = formatCurrency(costData.total);
    renderBreakdown(costData);
  }

  function initAutocomplete() {
    const fromInput = document.getElementById("from-address");
    const toInput = document.getElementById("to-address");

    const options = {
      componentRestrictions: { country: ["ca", "us"] },
      fields: ["formatted_address", "geometry"],
    };

    autocompleteFrom = new google.maps.places.Autocomplete(fromInput, options);
    autocompleteTo = new google.maps.places.Autocomplete(toInput, options);
  }

  function initMap() {
    map = new google.maps.Map(mapPreview, {
      zoom: 6,
      center: { lat: 43.589, lng: -79.644 },
      disableDefaultUI: true,
    });
    mapPreview.classList.add("visible");
  }

  function drawRoute(origin, destination) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
    });

    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result);
        }
      }
    );
  }

  function getDistance(origin, destination) {
    return new Promise((resolve, reject) => {
      distanceMatrixService.getDistanceMatrix(
        {
          origins: [origin],
          destinations: [destination],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
        },
        (response, status) => {
          if (status !== "OK") {
            reject(new Error("Could not calculate distance. Check your addresses and try again."));
            return;
          }

          const element = response.rows[0]?.elements[0];
          if (!element || element.status !== "OK") {
            reject(
              new Error(
                "Unable to find a driving route between these addresses. Please verify both locations."
              )
            );
            return;
          }

          const distanceKm = element.distance.value / 1000;
          resolve(distanceKm);
        }
      );
    });
  }

  function onMapsReady() {
    mapsLoaded = true;
    distanceMatrixService = new google.maps.DistanceMatrixService();
    initAutocomplete();
    initMap();
    apiNotice.hidden = true;
  }

  function loadGoogleMaps() {
    if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
      apiNotice.hidden = false;
      calculateBtn.disabled = true;
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      apiNotice.hidden = false;
      showError("Failed to load Google Maps. Check your API key and enabled APIs.");
    };
    document.head.appendChild(script);
  }

  window.initGoogleMaps = onMapsReady;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    if (!mapsLoaded) {
      showError("Google Maps is not loaded. Copy js/config.example.js to js/config.js and add your API key.");
      return;
    }

    const from = document.getElementById("from-address").value.trim();
    const to = document.getElementById("to-address").value.trim();
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);
    const width = parseFloat(document.getElementById("width").value);
    const depth = parseFloat(document.getElementById("depth").value);

    if (!from || !to) {
      showError("Please enter both origin and destination addresses.");
      return;
    }

    if (isNaN(weight) || weight <= 0) {
      showError("Please enter a valid weight greater than 0.");
      return;
    }

    if (isNaN(height) || isNaN(width) || isNaN(depth) || height <= 0 || width <= 0 || depth <= 0) {
      showError("Please enter valid dimensions for height, width, and depth.");
      return;
    }

    calculateBtn.disabled = true;
    calculateBtn.textContent = "Calculating…";

    try {
      const distanceKm = await getDistance(from, to);
      const costData = calculateShippingCost(distanceKm, weight, height, width, depth);

      showResult(costData);
      drawRoute(from, to);
    } catch (err) {
      showError(err.message || "An error occurred. Please try again.");
    } finally {
      calculateBtn.disabled = false;
      calculateBtn.textContent = "Calculate Shipping Cost";
    }
  });

  loadGoogleMaps();
})();
