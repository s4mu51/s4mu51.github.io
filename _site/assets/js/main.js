document.addEventListener("DOMContentLoaded", function () {
  /* Smooth scrolling for [data-scroll] anchors */
  if (window.SweetScroll) {
    new SweetScroll({ duration: 700, easing: "easeOutCubic" });
  }

  /* Cycle the nav brand text: pwned! -> try_harder -> skull */
  var brand = document.getElementById("brand-text");
  if (brand) {
    var brandItems = ["pwned!", "try_harder", "r00t"];
    var bi = 0;
    setInterval(function () {
      brand.style.opacity = "0";
      setTimeout(function () {
        bi = (bi + 1) % brandItems.length;
        var item = brandItems[bi];
        brand.textContent = item;
        brand.setAttribute("data-text", item);
        brand.style.opacity = "1";
      }, 200);
    }, 3800);
  }

  /* Add a solid background to the nav once the page is scrolled */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Footer Pac-Man scene -> launch the playable game */
  var pacScene = document.querySelector(".footer-pac");
  if (pacScene) {
    var launch = function () { if (window.PacmanGame) window.PacmanGame.open(); };
    pacScene.addEventListener("click", launch);
    pacScene.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); launch(); }
    });
  }

  /* Certification cards -> open flip modal (front badge / back summary + links) */
  var certModal = document.getElementById("cert-modal");
  if (certModal) {
    var flip = document.getElementById("cert-flip");
    var mImg = document.getElementById("cert-m-img");
    var mName = document.getElementById("cert-m-name");
    var mNameB = document.getElementById("cert-m-name-back");
    var mIssuer = document.getElementById("cert-m-issuer");
    var mSummary = document.getElementById("cert-m-summary");
    var mLinks = document.getElementById("cert-m-links");

    var openCert = function (card) {
      var img = card.querySelector(".cert-badge img");
      var name = card.querySelector("h3").textContent.trim();
      var detail = card.querySelector(".cert-detail");
      mImg.src = img ? img.src : "";
      mImg.alt = name;
      mName.textContent = name;
      mNameB.textContent = name;
      mIssuer.textContent = detail ? detail.querySelector(".d-issuer").textContent.trim() : "";
      mSummary.textContent = detail ? detail.querySelector(".d-summary").textContent.trim() : "";
      mLinks.innerHTML = detail ? detail.querySelector(".d-links").innerHTML : "";
      flip.classList.remove("flipped");
      certModal.hidden = false;
      certModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    var closeCert = function () {
      certModal.hidden = true;
      certModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };
    var toggleFlip = function (e) {
      if (e && e.target.closest("a")) return; // let verify links work
      flip.classList.toggle("flipped");
    };

    Array.prototype.forEach.call(document.querySelectorAll(".cert"), function (card) {
      card.addEventListener("click", function () { openCert(card); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCert(card); }
      });
    });
    flip.addEventListener("click", toggleFlip);
    flip.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleFlip(); }
    });
    document.getElementById("cert-close").addEventListener("click", closeCert);
    certModal.addEventListener("click", function (e) { if (e.target === certModal) closeCert(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !certModal.hidden) closeCert();
    });
  }

  /* Experience cards -> open detail modal */
  var xpModal = document.getElementById("xp-modal");
  if (xpModal) {
    var xpBody = document.getElementById("xp-modal-body");
    var xpCompany = document.getElementById("xp-modal-company");
    var xpRole = document.getElementById("xp-modal-role");

    var openXp = function (card) {
      var c = card.querySelector(".xp-company");
      var ro = card.querySelector(".xp-role");
      var detail = card.querySelector(".xp-detail");
      xpCompany.textContent = c ? c.textContent.trim() : "";
      xpRole.textContent = ro ? ro.textContent.trim() : "";
      xpBody.innerHTML = detail ? detail.innerHTML : "";
      xpModal.hidden = false;
      xpModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    var closeXp = function () {
      xpModal.hidden = true;
      xpModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    Array.prototype.forEach.call(document.querySelectorAll(".xp"), function (card) {
      card.addEventListener("click", function () { openXp(card); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openXp(card); }
      });
    });
    document.getElementById("xp-close").addEventListener("click", closeXp);
    xpModal.addEventListener("click", function (e) { if (e.target === xpModal) closeXp(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !xpModal.hidden) closeXp();
    });
  }

  /* Particle network background — cyan / electric blue */
  if (window.particlesJS) {
    particlesJS("particles-js", {
      particles: {
        number: { value: 55, density: { enable: true, value_area: 900 } },
        color: { value: ["#22d3ee", "#6ef3ff", "#2a3f5a"] },
        shape: { type: "circle" },
        opacity: {
          value: 0.5,
          random: true,
          anim: { enable: true, speed: 0.6, opacity_min: 0.1, sync: false }
        },
        size: { value: 2.5, random: true },
        line_linked: {
          enable: true,
          distance: 140,
          color: "#22d3ee",
          opacity: 0.22,
          width: 1
        },
        move: {
          enable: true,
          speed: 1.2,
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false
        }
      },
      interactivity: {
        detect_on: "window",
        events: {
          onhover: { enable: true, mode: "grab" },
          onclick: { enable: true, mode: "push" },
          resize: true
        },
        modes: {
          grab: { distance: 160, line_linked: { opacity: 0.5 } },
          push: { particles_nb: 3 }
        }
      },
      retina_detect: true
    });
  }
}, false);
