(() => {
  const menuButton = document.getElementById("menuBtn");
  const navigation = document.getElementById("mainNav");
  const scrollTopButton = document.getElementById("scrollTopBtn");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const open = navigation.classList.toggle("open");
      menuButton.classList.toggle("open", open);
      menuButton.setAttribute("aria-expanded", String(open));
    });
    navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuButton.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }));
  }

  document.querySelectorAll(".faq-item > button").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const answer = item.querySelector(".faq-answer");
      const open = item.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
      answer.style.maxHeight = open ? `${answer.scrollHeight}px` : "0px";
    });
  });

  if (scrollTopButton) {
    const update = () => scrollTopButton.classList.toggle("show", window.scrollY > 500);
    window.addEventListener("scroll", update, { passive: true });
    update();
    scrollTopButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  const elements = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    elements.forEach((element) => observer.observe(element));
  } else {
    elements.forEach((element) => element.classList.add("visible"));
  }
})();
