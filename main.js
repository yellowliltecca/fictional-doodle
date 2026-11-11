(() => {
  "use strict";
  const config = window.BUSINESS_CONFIG || {};
  const whatsapp = String(config.whatsapp || "79372523222").replace(/\D/g, "");
  const mapUrl = config.twoGisUrl || "https://2gis.ru/engels/firm/70000001006157383";

  document.querySelectorAll("[data-brand]").forEach((node) => { node.textContent = config.name || "SKYLINE"; });
  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => { link.href = "https://wa.me/" + whatsapp; });
  document.querySelectorAll("[data-map-link]").forEach((link) => { link.href = mapUrl; });

  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Открыть меню" : "Закрыть меню");
      mainNav.classList.toggle("is-open", !isOpen);
    });
    mainNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Открыть меню");
      mainNav.classList.remove("is-open");
    }));
  }

  document.querySelectorAll("[data-compare]").forEach((comparison) => {
    const range = comparison.querySelector(".compare-range");
    const handle = comparison.querySelector(".compare-handle");
    if (!range || !handle) return;
    const update = () => {
      comparison.style.setProperty("--split", range.value + "%");
      handle.setAttribute("aria-valuenow", range.value);
    };
    const moveTo = (clientX) => {
      const rect = comparison.getBoundingClientRect();
      if (!rect.width) return;
      range.value = String(Math.round(Math.max(0, Math.min(100, (clientX - rect.left) * 100 / rect.width))));
      update();
    };
    handle.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      handle.classList.add("is-dragging");
    });
    handle.addEventListener("pointermove", (event) => {
      if (handle.hasPointerCapture(event.pointerId)) moveTo(event.clientX);
    });
    const stop = () => handle.classList.remove("is-dragging");
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
    handle.addEventListener("keydown", (event) => {
      const delta = event.key === "ArrowLeft" ? -2 : event.key === "ArrowRight" ? 2 : 0;
      if (!delta) return;
      event.preventDefault();
      range.value = String(Math.max(0, Math.min(100, Number(range.value) + delta)));
      update();
    });
    update();
  });

  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      const select = document.querySelector('#bookingForm select[name="service"]');
      if (!select) return;
      const wanted = link.getAttribute("data-service");
      const option = Array.from(select.options).find((item) => item.textContent.trim() === wanted || item.value === wanted);
      if (option) select.value = option.value || option.textContent;
    });
  });

  const form = document.getElementById("bookingForm");
  const formStatus = document.getElementById("formStatus");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = new FormData(form);
      const name = String(values.get("name") || "").trim();
      const phone = String(values.get("phone") || "").trim();
      const service = String(values.get("service") || "Нужна консультация").trim();
      const message = String(values.get("message") || "").trim();
      const lines = [
        "Здравствуйте! Хочу обсудить услугу в Skyline.",
        "Имя: " + name,
        "Телефон: " + phone,
        "Услуга: " + service,
        "Автомобиль и пожелания: " + (message || "Не указано")
      ];
      const url = "https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(lines.join("\n"));
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = url;
      if (formStatus) formStatus.textContent = "Сообщение подготовлено. Проверьте данные и подтвердите отправку в WhatsApp.";
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const revealTargets = document.querySelectorAll(".service-card,.comparison-card,.studio-copy,.studio-panel,.step-card,.booking-form,.contact-card");
    revealTargets.forEach((node) => node.classList.add("reveal-pending"));
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-visible");
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((node) => observer.observe(node));
  }
})();