function hideLoader() {
  const loader = document.getElementById("loader-wrapper");
  if (!loader) return;
  loader.classList.add("fade-out");
  setTimeout(() => { loader.style.display = "none"; }, 600);
}

window.addEventListener("load", hideLoader);
