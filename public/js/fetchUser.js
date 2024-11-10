// Assumes you have an endpoint like '/api/users' to fetch user data
document.addEventListener("DOMContentLoaded", () => {
    fetch('/api/users')
        .then(response => response.json())
        .then(users => {
            const userContainer = document.getElementById("userContainer");
            users.forEach(user => {
                let userDiv = document.createElement("div");
                userDiv.className = "user";
                userDiv.textContent = `Username: ${user.username}, Level: ${user.level}`;
                userContainer.appendChild(userDiv);
            });
        })
        .catch(error => console.error('Error fetching users:', error));
});
