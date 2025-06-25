
"use client";

// This page is no longer used directly for booking.
// The functionality has been moved to a dialog on the login page.
// This file is kept to prevent 404 errors from old links but can be removed later.
export default function BookDemoPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <h1 className="text-2xl font-bold">Booking Page Not Found</h1>
            <p className="text-muted-foreground mt-2">
                The booking form has been moved. Please initiate booking from the main login page.
            </p>
        </div>
    );
}
