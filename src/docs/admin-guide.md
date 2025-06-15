# TaskMaster Admin Guide

This guide explains how to set up the initial administrator account for TaskMaster and how to manage users and their roles.

## Initial Administrator Setup

TaskMaster does not have a public signup page. The first administrator account must be created manually in your Firebase project.

1.  **Create Admin User in Firebase Authentication:**
    *   Go to your Firebase project in the [Firebase Console](https://console.firebase.google.com/).
    *   Navigate to **Authentication** (under Build).
    *   Go to the **Users** tab and click **"Add user"**.
    *   Enter an email (e.g., `admin@example.com`) and a strong password for the administrator.
    *   Click **"Add user"**.
    *   Once created, find the user in the list and **copy their UID**. This UID is crucial for the next step.

2.  **Create Admin Profile in Firestore:**
    *   In the Firebase Console, navigate to **Firestore Database** (under Build).
    *   Select your `users` collection (if it doesn't exist, create it).
    *   Click **"Add document"**.
    *   For the **Document ID**, **paste the UID** you copied from Firebase Authentication in the previous step.
    *   Add the following fields to this document:
        *   `name` (String): e.g., "Admin User"
        *   `role` (String): Set to `Administrator`
        *   `createdAt` (Timestamp): Set to the current date and time
        *   `teamId` (String): Set to `null` initially (or the ID of a pre-existing team if applicable)
        *   `avatar` (String, Optional): You can leave this blank or provide a URL to an avatar image. If left blank, a default placeholder will be used.
    *   Click **"Save"**.

The administrator account is now set up. You can log in to TaskMaster using the email and password you created in Firebase Authentication.

## Managing Users (as Admin)

Once logged in as an administrator, you can manage other user profiles from the "Manage Users" section in the TaskMaster application.

### User Roles

TaskMaster uses the following roles:
*   **User**: Basic access to view tasks, backlogs, sprints, and roadmaps. Can participate in chat.
*   **Supervisor**: All "User" permissions, plus write access to tasks, backlogs, and sprints. Can view reports and create chat channels.
*   **Manager**: All "Supervisor" permissions, plus the ability to create and manage projects.
*   **Administrator**: Full control over the application, including managing users, teams, and all project settings.

### Creating New User Profiles

When an admin creates a new user profile via the TaskMaster application, they are creating the user's data record in Firestore, including assigning a role. The corresponding Firebase Authentication account (for login) must be created separately by the admin in the Firebase Console.

**Workflow:**

1.  **Create Auth User in Firebase Console:**
    *   Go to Firebase Console > Authentication > Users tab.
    *   Click **"Add user"**.
    *   Enter the new user's **email** and a **temporary password**.
    *   Click **"Add user"**.
    *   **Copy the UID** of this newly created Firebase Auth user.

2.  **Create User Profile in TaskMaster App:**
    *   Log in to TaskMaster as an administrator.
    *   Navigate to **Manage Users** from the sidebar.
    *   Click the **"Create User Profile"** button.
    *   In the dialog:
        *   **User ID (Firebase Auth UID):** Paste the UID obtained from the Firebase Console.
        *   **User Name:** Enter the full name of the user.
        *   **Avatar URL (Optional):** Provide a URL or leave blank.
        *   **Team:** Assign the user to an existing team or select "No Team".
        *   **Role:** Select the appropriate role for the user (User, Supervisor, Manager, or Administrator).
    *   Click **"Create User Profile"**.

This process creates the user's profile in Firestore. The new user can now log in.

### Editing User Profiles

*   Admins can edit any user's profile details (name, avatar, team, role) via the "Manage Users" section.
*   An Administrator cannot change their own role using the "Manage Users" interface.
*   The User ID (Firebase UID) cannot be changed after creation.

### Deleting User Profiles

*   When an admin deletes a user from the "Manage Users" section, this **only deletes the user's profile data from Firestore**.
*   **Important:** This action **does not** delete the user's Firebase Authentication account. The admin must manually delete the user from Firebase Authentication.

## Security Note

The system relies on administrators to manage Firebase Authentication accounts. User roles control access to features within the TaskMaster application itself. Ensure Firestore security rules are also set up to enforce these roles at the database level for robust security.
