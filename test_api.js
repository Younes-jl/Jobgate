fetch("http://localhost:8000/api/interviews/offers/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("accessToken")
  },
  body: JSON.stringify({
    "title": "Test Offer",
    "description": "Test Description",
    "location": "Test Location"
  })
})
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();
})
.then(data => console.log("Success:", data))
.catch(error => console.error("Error:", error));
