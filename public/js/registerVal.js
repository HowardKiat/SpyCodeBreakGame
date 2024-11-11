// registerVal.js
function validatePassword() {
    const password = document.getElementById('password').value;
    const validationErrors = [];

    // Match the backend validation rules exactly
    if (password.length < 8) validationErrors.push("Password must be at least 8 characters long.");
    if (password.length > 100) validationErrors.push("Password must be no more than 100 characters long.");
    if (!/[A-Z]/.test(password)) validationErrors.push("Password must have at least one uppercase letter.");
    if (!/[a-z]/.test(password)) validationErrors.push("Password must have at least one lowercase letter.");
    if (!/[0-9]/.test(password)) validationErrors.push("Password must have at least one digit.");
    if (/\s/.test(password)) validationErrors.push("Password should not contain spaces.");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) validationErrors.push("Password must have at least one special character.");

    const validationErrorsList = document.getElementById('validationErrors');
    validationErrorsList.innerHTML = '';

    validationErrors.forEach(error => {
        const listItem = document.createElement('li');
        listItem.textContent = error;
        validationErrorsList.appendChild(listItem);
    });

    const modal = document.getElementById('validationModal');
    modal.style.display = validationErrors.length > 0 ? 'block' : 'none';

    return validationErrors.length === 0; // Return validation result
}

function closeModal() {
    document.getElementById('validationModal').style.display = 'none';
}

function submitForm() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Clear previous messages
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';

    // Validate password format
    if (!validatePassword()) {
        document.getElementById('errorMessage').textContent = 'Please fix password validation errors';
        document.getElementById('errorMessage').style.display = 'block';
        return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        document.getElementById('errorMessage').textContent = 'Passwords do not match';
        document.getElementById('errorMessage').style.display = 'block';
        return;
    }

    // Prepare AJAX request
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username,
            email,
            password,
            confirmPassword  // Include confirmPassword in the request
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('successMessage').textContent = data.message;
                document.getElementById('successMessage').style.display = 'block';
                // Optionally redirect to login page after successful registration
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                document.getElementById('errorMessage').textContent = data.message;
                document.getElementById('errorMessage').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('errorMessage').textContent = 'An error occurred during registration';
            document.getElementById('errorMessage').style.display = 'block';
        });
}