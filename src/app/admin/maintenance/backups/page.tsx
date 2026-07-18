
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { DatabaseBackup, Download, HardDriveDownload, Loader2, UploadCloud, Save, Terminal, HardDriveUpload, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { BackupScheduleSettings } from '@/lib/types';
import { pushBackupToGoogleDrive } from '@/actions/backup-actions';

const providedBackupData = {
  "backupType": "Full System Backup",
  "timestamp": "2025-07-04T15:43:04.592Z",
  "data": {
    "clients": [
      { "id": "5MyScSNM6oUs3SlPqC0f", "subscriptionStatus": "active", "subscriptionRate": 100, "name": "D' First Hub", "subscriptionPlanName": "Individual", "subscriptionEndDate": "2025-08-31T05:00:00.000Z", "logoUrl": "https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/client_logos%2F3f86dfa8-5d01-44bd-8c37-49ba1d744394-cropped.png?alt=media&token=ff1ae7fa-2df1-4ece-a397-4224eb731aaf", "status": "Active" },
      { "id": "RUkVtERL4yYUwV6PEypO", "subscriptionEndDate": "2025-06-30T05:00:00.000Z", "name": "Semin Solutions", "logoUrl": "https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/client_logos%2F21a8c638-a543-49ee-a97f-22e95acf6d5e-cropped.png?alt=media&token=199913c5-59b4-47a0-99c5-b0d154ed9637", "subscriptionStatus": "active" },
      { "id": "c3z1koTiyIqD6aAgpIfs", "logoUrl": "https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/client_logos%2F3933e2b3-200a-41b0-beb9-a8ab8d2ee234-cropped.png?alt=media&token=02a8c638-ae25-4318-b431-b079ba420602", "status": "Active", "subscriptionStatus": "active", "subscriptionEndDate": "2025-08-31T05:00:00.000Z", "name": "Demo Client", "subscriptionPlanName": "Company", "subscriptionRate": 500 },
      { "id": "uvovEi3kvjbJHn5HPVoF", "subscriptionRate": 0, "subscriptionStatus": "active", "status": "Active", "name": "i-VirtuaTech", "logoUrl": "https://firebasestorage.googleapis.com/v0/b/tenanttracker-u4wuw.firebasestorage.app/o/client_logos%2Fb40a1e7e-29f4-4027-b923-8308ff92d199-cropped.png?alt=media&token=10feab4d-3992-4404-be42-7adff32967e7", "subscriptionEndDate": "2025-07-31T05:00:00.000Z", "subscriptionPlanName": "Individual" }
    ],
    "superAdminUsers": [
      { "id": "5QkyZyRPN0NQITIo7mz9", "password": "$2a$10$QO0pD6bRqXE6X8EvZ85tZugqLvpbv1Klexv9E/n80ecWSLxkyTFGO", "username": "hiro" },
      { "id": "lWcRgO3mjaEcpbqvhuvh", "password": "$2a$10$GV7Ff79wm.l35dlE4ckleuMtIx.RYt8F1T7rUhk0YTY..fgWN8mT6", "username": "oxfordadmin" },
      { "id": "w9F4bvuQAK0pJ5b6ZouS", "lastActive": "2025-06-24T03:52:45.036Z", "password": "$2a$10$LN.tgyTUc7ZgM2fdnxew5ORA9PC4wV5Bd09bVf0ajsdcDPAhhLAjq", "username": "cjadeadmin" }
    ],
    "managedUsers": [
      { "id": "Lj3M38HJvPd32BFKmypF", "clientId": "c3z1koTiyIqD6aAgpIfs", "password": "$2a$10$geMRi6/4TcAA11C2XoSA0OMQeCvIpXTh32zw4BHi53Vb5da6pgX2m", "username": "demo", "role": "admin", "email": "demo_client@gmail.com" },
      { "id": "TJbqQpK8TvsBNCuQWdsP", "email": "semin@seminsolutions.com", "password": "$2a$10$MH1EEBEKCuRXb7ztGAuPXOx9n4Sv7s5xIE/Lfo9IyTm2OxFMzHSX6", "username": "seminadmin", "role": "admin", "clientId": "RUkVtERL4yYUwV6PEypO" },
      { "id": "Xa71bK9m52uBQiCaepjx", "email": "nfuerzas@gmail.com", "password": "hackmenot", "username": "nfuerzas", "role": "admin", "clientId": "uvovEi3kvjbJHn5HPVoF" },
      { "id": "Z5UoqJgjOhuYWxiGVAlq", "role": "admin", "username": "adminjelie", "email": "jeliemaytog10.14@gmail.com", "password": "$2a$10$SZcUUdnDYlwF7lBoMYuLve5xhZH8EDLs.wV5IfpizzqLS7BiJkpiC", "clientId": "uvovEi3kvjbJHn5HPVoF" },
      { "id": "wwtAQp0THlmJxaO7Y5n6", "username": "adminlalai", "email": "lalai5@gmail.com", "clientId": "5MyScSNM6oUs3SlPqC0f", "role": "admin", "password": "$2a$10$LEt9REirGENgi.ZdCRHu2.p8tCGUV2IxCIfrfiHxBJFjRl53GPGLe" },
      { "id": "xJuX9ATeEI0dN1OiE3hJ", "clientId": "uvovEi3kvjbJHn5HPVoF", "email": "neilf@gmail.com", "role": "user", "username": "neilf", "password": "$2a$10$2XxzQxXoAMJOxklSltotd.go/oCLYSTarxSAZsib/ckQGpztLYbfe" },
      { "id": "y145lxqCCkLBN2L8XYgm", "username": "joel", "email": "joelestrebor@gmail.com", "role": "user", "clientId": "5MyScSNM6oUs3SlPqC0f", "password": "$2a$10$CItlCg.c/jhC4J7JWC8KYucLypCZYLIzoJHTZmCRU5GO8z23qpbZC" }
    ],
    "tenants": [
      { "id": "22wYEtenx6HVD6Nn9joq", "monthlyRentalRate": 4000, "status": "active", "joinDate": "2025-07-05T00:00:00.000Z", "email": "cincojenelyn01@gmail.com", "name": "Herle Mae Sumiguin", "hasAccount": false, "clientId": "5MyScSNM6oUs3SlPqC0f", "phone": "09667464257" },
      { "id": "4Qo9V6JTmJAHv9MEX1rp", "phone": "09667464257", "name": "Ruvelyn Dalogdog", "status": "active", "joinDate": "2025-07-05T00:00:00.000Z", "hasAccount": false, "monthlyRentalRate": 4000, "clientId": "5MyScSNM6oUs3SlPqC0f", "email": "cincojenelyn01@gmail.com" },
      { "id": "4thdMrmYYHIWTocZjUd0", "phone": "09667464257", "securityDeposit": 0, "monthlyRentalRate": 1950, "clientId": "5MyScSNM6oUs3SlPqC0f", "joinDate": "2025-07-05T00:00:00.000Z", "status": "active", "email": "cincojenelyn01@gmail.com", "hasAccount": false, "name": "Nerissa Aguiles" },
      { "id": "60g4rGa2JbYXLlBgXnTO", "joinDate": "2025-07-05T00:00:00.000Z", "temporaryPassword": true, "password": "$2a$10$cnnHe8KZb49mJDvwKuNZb.5LfkC/47ig9bb/RdohYiiqzljTpaP3e", "hasAccount": true, "username": "tenant130779", "monthlyRentalRate": 4000, "email": "cincojenelyn01@gmail.com", "clientId": "5MyScSNM6oUs3SlPqC0f", "phone": "09667464257", "status": "active", "name": "Glydel Dalay" },
      { "id": "6MMsuWBIRMxFPdUheS1N", "status": "active", "clientId": "5MyScSNM6oUs3SlPqC0f", "joinDate": "2025-07-05T00:00:00.000Z", "phone": "09667464257", "monthlyRentalRate": 4000, "email": "cincojenelyn01@gmail.com", "name": "Daisy Batawi", "hasAccount": false },
      { "id": "7klR0HoerGqpOgTvnG1Y", "name": "Mary Jane Luao", "email": "cincojenelyn01@gmail.com", "status": "active", "hasAccount": false, "monthlyRentalRate": 4000, "phone": "09667464257", "joinDate": "2025-07-05T00:00:00.000Z", "clientId": "5MyScSNM6oUs3SlPqC0f" },
      { "id": "CCUwRFRZl1dADbe636DL", "securityDeposit": 6000, "phone": "123123123", "temporaryPassword": false, "monthlyRentalRate": 3000, "status": "active", "email": "tenant2@gmail.com", "clientId": "c3z1koTiyIqD6aAgpIfs", "hasAccount": true, "username": "tenant446902", "joinDate": "2025-07-01T00:00:00.000Z", "password": "$2a$10$zOC4.LLWKUmUpS47iwhXF.Xr263kFFouU5zY0iE9yag0YewFVC/xG", "name": "Tenant 2" },
      { "id": "Da0z1nWy9kNFESNkR7Op", "monthlyRentalRate": 4000, "name": "Abner Fuerzas", "status": "active", "clientId": "uvovEi3kvjbJHn5HPVoF", "phone": "09111111111", "hasAccount": false, "joinDate": "2025-05-24T00:00:00.000Z", "email": "abner@gmail.com" },
      { "id": "EV2HeqoJjmAzhVJo5aIi", "status": "active", "monthlyRentalRate": 4000, "name": "Novy Joy Sofia", "joinDate": "2025-07-05T00:00:00.000Z", "hasAccount": false, "clientId": "5MyScSNM6oUs3SlPqC0f", "email": "cincojenelyn01@gmail.com", "phone": "09667464257" },
      { "id": "EtqbnHCzvdi0IRjO5Xh9", "monthlyRentalRate": 5000, "email": "tenant5@gmail.com", "name": "Tenant 5", "securityDeposit": 5000, "status": "active", "rent_history": [{ "rate": 5000, "startDate": "2025-07-06T00:00:00.000Z", "endDate": null }], "phone": "12312312", "hasAccount": false, "joinDate": "2025-07-06T00:00:00.000Z", "clientId": "c3z1koTiyIqD6aAgpIfs", "monthlyDueDay": null },
      { "id": "NgyJJuatv8CXW1ixri5p", "email": "cincojenelyn01@gmail.com", "joinDate": "2025-06-30T00:00:00.000Z", "status": "active", "phone": "09667464257", "securityDeposit": 0, "monthlyRentalRate": 4000, "clientId": "5MyScSNM6oUs3SlPqC0f", "hasAccount": false, "name": "Ethyl Paran" },
      { "id": "QhMTQtIjLe83TCYRhOni", "securityDeposit": 5000, "monthlyDueDay": null, "phone": "4234234", "clientId": "c3z1koTiyIqD6aAgpIfs", "rent_history": [{ "rate": 6000, "endDate": null, "startDate": "2025-07-07T00:00:00.000Z" }], "monthlyRentalRate": 6000, "hasAccount": false, "joinDate": "2025-07-07T00:00:00.000Z", "name": "Tenant 6", "email": "tenant6@gmail.com", "status": "active" },
      { "id": "XoO0TUOAdLLQOWD2GXje", "joinDate": "2025-06-23T00:00:00.000Z", "hasAccount": false, "name": "Lance Andrei", "phone": "1234567890", "status": "active", "monthlyRentalRate": 3000, "clientId": "uvovEi3kvjbJHn5HPVoF", "email": "oxfordgalawan@gmail.com" },
      { "id": "YQZZmlbumd7pFi91JmAQ", "phone": "123123123", "securityDeposit": 5000, "monthlyRentalRate": 5000, "clientId": "c3z1koTiyIqD6aAgpIfs", "joinDate": "2025-07-01T00:00:00.000Z", "status": "active", "email": "tenant1@gmail.com", "hasAccount": false, "name": "Tenant 1" },
      { "id": "YTnufuMFrWSQ7aFRvk6f", "joinDate": "2025-07-05T00:00:00.000Z", "phone": "09667464257", "monthlyRentalRate": 4000, "hasAccount": false, "status": "active", "name": "Charis Mae Tero Dumala", "clientId": "5MyScSNM6oUs3SlPqC0f", "email": "cincojenelyn01@gmail.com" },
      { "id": "b9FFqUicLt7Rb7N8WcWV", "hasAccount": false, "joinDate": "2025-07-05T00:00:00.000Z", "monthlyRentalRate": 4000, "clientId": "5MyScSNM6oUs3SlPqC0f", "status": "active", "phone": "09667464257", "name": "Flora Mae Dumala", "email": "cincojenelyn01@gmail.com" },
      { "id": "djbS6xgm7g4FJX5N9IUA", "phone": "09667464257", "email": "cincojenelyn01@gmail.com", "hasAccount": false, "clientId": "5MyScSNM6oUs3SlPqC0f", "monthlyRentalRate": 4000, "status": "active", "joinDate": "2025-07-05T00:00:00.000Z", "name": "Anna Pandayan" },
      { "id": "gFnmYTbI7wL0wnbr17vA", "email": "tenant4@gmail.com", "rent_history": [{ "endDate": "2025-05-09T00:00:00.000Z", "startDate": "2025-04-01T00:00:00.000Z", "rate": 5000 }, { "rate": 4000, "endDate": null, "startDate": "2025-05-10T00:00:00.000Z" }], "phone": "1231231254", "joinDate": "2025-04-01T00:00:00.000Z", "monthlyRentalRate": 4000, "status": "active", "securityDeposit": 8000, "monthlyDueDay": 4, "hasAccount": false, "clientId": "c3z1koTiyIqD6aAgpIfs", "name": "Tenant 4" },
      { "id": "kUe8Dwtfl2eGIu0gSvUY", "monthlyRentalRate": 4000, "joinDate": "2025-07-05T00:00:00.000Z", "name": "Shaddrack Alemar Manalo Banugon", "status": "active", "clientId": "5MyScSNM6oUs3SlPqC0f", "phone": "09667464257", "email": "cincojenelyn01@gmail.com", "hasAccount": false },
      { "id": "kdNL1Fc7U9BRcp8TAjI4", "clientId": "uvovEi3kvjbJHn5HPVoF", "email": "jelie1014@gmail.com", "monthlyRentalRate": 5000, "status": "active", "hasAccount": false, "joinDate": "2025-05-25T00:00:00.000Z", "phone": "09111111111", "name": "Mayang Fuerzas" },
      { "id": "mruQU4RmibcZAzUuUEwu", "joinDate": "2025-05-24T00:00:00.000Z", "name": "Ronel Salazar", "clientId": "uvovEi3kvjbJHn5HPVoF", "status": "active", "monthlyRentalRate": 6000, "hasAccount": false, "email": "ron@gmail.com", "phone": "1234567890" },
      { "id": "muEgv9kiBPrHWmTyZsFs", "email": "jhonful@gmail.com", "status": "active", "clientId": "uvovEi3kvjbJHn5HPVoF", "name": "Jhon Full", "monthlyRentalRate": 7000, "joinDate": "2025-05-24T00:00:00.000Z", "phone": "09111111111", "hasAccount": false },
      { "id": "pCUI0e074piGLNkXJfeL", "joinDate": "2025-07-05T00:00:00.000Z", "email": "cincojenelyn01@gmail.com", "password": "$2a$10$kQGr8mNNOGx/gk47E6OJge2Zt4cwlAPR.Nh7lBcCSAfFkK8SIvcPC", "clientId": "5MyScSNM6oUs3SlPqC0f", "username": "tenant856895", "phone": "09667464257", "temporaryPassword": true, "name": "Amy Cris Daluyon", "status": "active", "monthlyRentalRate": 4000, "hasAccount": true },
      { "id": "qcdQ10vYko0YwhTLVzlv", "status": "active", "rentAdjustmentDate": "2025-07-01", "email": "tenant3@gmail.com", "phone": "21234234243", "joinDate": "2025-01-01T00:00:00.000Z", "clientId": "c3z1koTiyIqD6aAgpIfs", "monthlyRentalRate": 4000, "hasAccount": false, "name": "Tenant 3", "securityDeposit": 5000, "rent_history": [{ "startDate": "2025-01-01T00:00:00.000Z", "rate": 5000, "endDate": "2025-06-30T00:00:00.000Z" }, { "startDate": "2025-07-01T00:00:00.000Z", "rate": 4000, "endDate": null }] }
    ],
    "payments": [
      { "id": "3ecmVHUYdqvzZWm5cFOe", "date": "2025-07-01T19:03:56.371Z", "paymentMethod": "Cash", "clientId": "c3z1koTiyIqD6aAgpIfs", "amount": 4000, "discountDescription": "", "discountApplied": 0, "tenantId": "CCUwRFRZl1dADbe636DL" },
      { "id": "BSO8OOnd7UfZvtX6dDfu", "clientId": "c3z1koTiyIqD6aAgpIfs", "tenantId": "CCUwRFRZl1dADbe636DL", "discountDescription": "", "checkNumber": "654654", "amount": 200, "date": "2025-07-02T04:53:28.343Z", "discountApplied": 0, "paymentMethod": "Check" },
      { "id": "DB54khZs8W0JHBg04EQz", "clientId": "c3z1koTiyIqD6aAgpIfs", "amount": 10000, "date": "2025-07-04T11:07:58.017Z", "tenantId": "gFnmYTbI7wL0wnbr17vA", "paymentMethod": "Security Deposit" },
      { "id": "F6kQyCKwyhyDbGrAmZme", "amount": 6000, "clientId": "c3z1koTiyIqD6aAgpIfs", "date": "2025-07-01T00:00:00.000Z", "paymentMethod": "Security Deposit", "tenantId": "CCUwRFRZl1dADbe636DL" },
      { "id": "L25ATAvkaagWvMJzKj7W", "discountApplied": 0, "date": "2025-07-01T19:00:03.429Z", "paymentMethod": "From Credit", "discountDescription": "Auto-applied from ₱1000.00 credit towards new Electricity Bill charge.", "amount": 1000, "clientId": "c3z1koTiyIqD6aAgpIfs", "tenantId": "YQZZmlbumd7pFi91JmAQ" },
      { "id": "NAoAM0S6toAfzHjpEsGC", "tenantId": "gFnmYTbI7wL0wnbr17vA", "date": "2025-04-01T00:00:00.000Z", "paymentMethod": "Security Deposit", "amount": 10000, "clientId": "c3z1koTiyIqD6aAgpIfs" },
      { "id": "QcYKoJtlh10Lh6r1F1cd", "amount": 5000, "date": "2025-07-04T11:16:10.440Z", "tenantId": "EtqbnHCzvdi0IRjO5Xh9", "clientId": "c3z1koTiyIqD6aAgpIfs", "paymentMethod": "Security Deposit" },
      { "id": "ScvYcCpe6JipzZK3aQMQ", "tenantId": "CCUwRFRZl1dADbe636DL", "clientId": "c3z1koTiyIqD6aAgpIfs", "date": "2025-07-01T19:05:00.224Z", "discountApplied": 0, "discountDescription": "", "amount": 1000, "paymentMethod": "Bank Transfer" },
      { "id": "TOnj5CrUsEJQD5uI9toq", "tenantId": "YQZZmlbumd7pFi91JmAQ", "amount": 5000, "clientId": "c3z1koTiyIqD6aAgpIfs", "date": "2025-07-01T00:00:00.000Z", "paymentMethod": "Security Deposit" },
      { "id": "USozG59LCukpfK514Iyu", "paymentMethod": "Security Deposit", "clientId": "c3z1koTiyIqD6aAgpIfs", "tenantId": "gFnmYTbI7wL0wnbr17vA", "amount": -2000, "date": "2025-07-04T11:26:17.040Z" },
      { "id": "WwExTFTTg1gy28dYFTsy", "amount": 1000, "paymentMethod": "From Deposit", "date": "2025-07-04T11:07:29.331Z", "clientId": "c3z1koTiyIqD6aAgpIfs", "tenantId": "gFnmYTbI7wL0wnbr17vA" },
      { "id": "YzOUjyj89WoteukjdqeQ", "tenantId": "YQZZmlbumd7pFi91JmAQ", "paymentMethod": "Cash", "discountApplied": 0, "clientId": "c3z1koTiyIqD6aAgpIfs", "amount": 5000, "discountDescription": "", "date": "2025-07-01T18:59:27.272Z" },
      { "id": "cVr9tHiUbHtQU5Faf3AT", "tenantId": "gFnmYTbI7wL0wnbr17vA", "amount": 5000, "clientId": "c3z1koTiyIqD6aAgpIfs", "paymentMethod": "Security Deposit", "date": "2025-07-04T11:45:00.426Z" },
      { "id": "hTD2ECeiFTd5kvWK1JUW", "paymentMethod": "Security Deposit", "tenantId": "QhMTQtIjLe83TCYRhOni", "amount": -5000, "date": "2025-07-04T11:44:23.288Z", "clientId": "c3z1koTiyIqD6aAgpIfs" },
      { "id": "ixl1cPXg2SCXlcdN57Qf", "discountDescription": "", "amount": 6000, "clientId": "uvovEi3kvjbJHn5HPVoF", "date": "2025-06-24T08:03:51.966Z", "tenantId": "kdNL1Fc7U9BRcp8TAjI4", "discountApplied": 0, "paymentMethod": "Cash" },
      { "id": "j7zXFsfqFdPtSS4LwdCm", "paymentMethod": "Security Deposit", "tenantId": "qcdQ10vYko0YwhTLVzlv", "amount": 5000, "clientId": "c3z1koTiyIqD6aAgpIfs", "date": "2025-01-01T00:00:00.000Z" },
      { "id": "mMMebSMUynnDGoyAejJc", "clientId": "c3z1koTiyIqD6aAgpIfs", "date": "2025-07-04T13:37:52.532Z", "amount": 5000, "tenantId": "EtqbnHCzvdi0IRjO5Xh9", "paymentMethod": "Cash", "discountDescription": "", "checkNumber": "", "discountApplied": 0 },
      { "id": "nzXivgle3AafdkZ7bqeI", "date": "2025-07-04T11:42:21.689Z", "clientId": "c3z1koTiyIqD6aAgpIfs", "tenantId": "QhMTQtIjLe83TCYRhOni", "paymentMethod": "Security Deposit", "amount": 10000 },
      { "id": "qCKYzV0QUE7dqxpaAxCp", "clientId": "c3z1koTiyIqD6aAgpIfs", "checkNumber": "123123", "date": "2025-07-02T04:54:50.647Z", "discountApplied": 0, "paymentMethod": "Check", "discountDescription": "", "amount": 1500, "tenantId": "YQZZmlbumd7pFi91JmAQ" },
      { "id": "vtU615QZYoW2Rgiz66I1", "amount": 15000, "clientId": "c3z1koTiyIqD6aAgpIfs", "checkNumber": "23423423", "tenantId": "qcdQ10vYko0YwhTLVzlv", "discountDescription": "", "discountApplied": 0, "date": "2025-07-04T10:08:09.940Z", "paymentMethod": "Check" },
      { "id": "wvOJlDjr1yPsh32PklvN", "tenantId": "XoO0TUOAdLLQOWD2GXje", "amount": 3000, "date": "2025-06-24T09:11:40.010Z", "clientId": "uvovEi3kvjbJHn5HPVoF", "paymentMethod": "Cash", "discountDescription": "", "discountApplied": 0 }
    ],
    "expenses": [],
    "additionalDues": [
      { "id": "E0z2T6SrfRSelIxzM9WI", "amount": 1000, "dueDate": "2025-07-01T19:03:06.779Z", "tenantId": "YQZZmlbumd7pFi91JmAQ", "type": "Electricity Bill", "clientId": "c3z1koTiyIqD6aAgpIfs", "notes": "", "createdAt": "2025-07-01T19:03:16.225Z", "status": "unpaid" },
      { "id": "Fsrno6WrHMQIBdiJVkti", "type": "Electricity Bill", "dueDate": "2025-07-01T18:59:48.881Z", "status": "unpaid", "createdAt": "2025-07-01T19:00:03.429Z", "notes": "", "clientId": "c3z1koTiyIqD6aAgpIfs", "tenantId": "YQZZmlbumd7pFi91JmAQ", "amount": 1500 },
      { "id": "Mb69eAPcqVv7rBtKh3sh", "tenantId": "CCUwRFRZl1dADbe636DL", "status": "unpaid", "notes": "", "clientId": "c3z1koTiyIqD6aAgpIfs", "dueDate": "2025-07-02T04:53:19.215Z", "createdAt": "2025-07-02T04:53:26.217Z", "type": "Water Bill", "amount": 200 },
      { "id": "rcyH7oVWq1yl2GKWYMEQ", "dueDate": "2025-07-01T19:03:26.319Z", "notes": "", "type": "Electricity Bill", "createdAt": "2025-07-01T19:03:33.892Z", "status": "unpaid", "tenantId": "CCUwRFRZl1dADbe636DL", "clientId": "c3z1koTiyIqD6aAgpIfs", "amount": 2000 }
    ],
    "businesses": [
      { "id": "5oCK99CJbQHIdHgCDO9g", "dayOfMonth": 25, "breakdownConfig": [], "name": "Car Rental", "clientId": "5MyScSNM6oUs3SlPqC0f", "trackingFrequency": "monthly" },
      { "id": "McQpt7wHSz2XyEd268my", "trackingFrequency": "weekly", "clientId": "5MyScSNM6oUs3SlPqC0f", "breakdownConfig": [{ "value": 60, "type": "percentage", "name": "ROI", "id": "ab70753f-9f6d-4343-890b-52cc90cbe71e" }, { "type": "fixed", "value": 4000, "id": "41a7e98b-ab17-4ee3-8c66-3f89c32c501b", "name": "Weekly Expenses" }, { "name": "Tithes", "type": "percentage", "value": 10, "id": "f07ed053-7932-43d2-b838-dbb82bd5ad4c" }, { "id": "d36b45e0-8b5c-4c53-8038-729764faaf10", "type": "percentage", "name": "Savings", "value": 20 }, { "value": 0, "type": "manual_input", "name": "Daily Expenses", "id": "7b011734-5927-4a7f-9514-3290ed14fad1" }], "weeklyDay": 5, "name": "Cinco's Select" },
      { "id": "ryFeeYRFyTF7vJ0FuZXe", "clientId": "5MyScSNM6oUs3SlPqC0f", "breakdownConfig": [{ "id": "71fceecc-c63c-498b-b627-3ca360968c93", "name": "ROI", "type": "percentage", "value": 20 }, { "name": "Monthly Expenses ", "type": "manual_input", "id": "0ad180e7-b66b-4526-808d-eb3f0b69d7fc", "value": 0 }, { "id": "974847dd-d338-4479-8be1-063ce175a96e", "name": "Tithes", "type": "percentage", "value": 10 }, { "type": "percentage", "id": "ac26b3b7-7124-407e-b722-ecbd706d1ff0", "name": "Savings", "value": 20 }], "trackingFrequency": "bi-monthly", "name": "D' First Coworking Space" },
      { "id": "yI8Sueh1pO4hrnmUawTB", "trackingFrequency": "monthly", "dayOfMonth": 31, "breakdownConfig": [{ "id": "40be46aa-a2a7-4e8e-98db-b92ff0ed252b", "type": "fixed", "value": 10, "name": "Tithes" }], "name": "Piso Wifi and House Wifi", "clientId": "5MyScSNM6oUs3SlPqC0f" }
    ],
    "weeklyIncomes": [
      { "id": "0vLIEEckz6cRaF4rKUwB", "businessId": "McQpt7wHSz2XyEd268my", "income": 50000, "weekOf": "2025-05-22T16:00:00.000Z", "clientId": "5MyScSNM6oUs3SlPqC0f", "breakdown": { "Weekly Expenses": 4000, "Tithes": 2100, "Savings": 3780, "ROI": 25000, "Daily Expenses": 0 }, "remainingMoney": 15120 },
      { "id": "2XgoegyL3720ZDO4hOjb", "clientId": "5MyScSNM6oUs3SlPqC0f", "breakdown": { "ROI": 25200, "Tithes": 1280, "Weekly Expenses": 4000, "Savings": 2304, "Daily Expenses": 0 }, "remainingMoney": 9216, "businessId": "McQpt7wHSz2XyEd268my", "weekOf": "2025-06-05T16:00:00.000Z", "income": 42000 },
      { "id": "4s3QLuXaeruPuwHfbDbQ", "remainingMoney": 4100, "income": 4100, "breakdown": {}, "businessId": "yI8Sueh1pO4hrnmUawTB", "clientId": "5MyScSNM6oUs3SlPqC0f", "weekOf": "2025-06-29T16:00:00.000Z" },
      { "id": "AJlkRrWbh3LpTao5giiY", "breakdown": { "Daily Expenses": 0, "Weekly Expenses": 4000, "Tithes": 1350, "Savings": 2430, "ROI": 17500 }, "weekOf": "2025-05-08T16:00:00.000Z", "clientId": "5MyScSNM6oUs3SlPqC0f", "remainingMoney": 9720, "businessId": "McQpt7wHSz2XyEd268my", "income": 35000 },
      { "id": "JBqInVkkcl01kQMdYAYm", "weekOf": "2025-06-25T09:20:15.302Z", "remainingMoney": 1800, "clientId": "5MyScSNM6oUs3SlPqC0f", "income": 1800, "businessId": "5oCK99CJbQHIdHgCDO9g", "breakdown": {} },
      { "id": "MDVVkgcMoV08DqNPdWFA", "remainingMoney": 6048, "breakdown": { "Weekly Expenses": 4000, "Daily Expenses": 0, "ROI": 18600, "Tithes": 840, "Savings": 1512 }, "income": 31000, "clientId": "5MyScSNM6oUs3SlPqC0f", "businessId": "McQpt7wHSz2XyEd268my", "weekOf": "2025-06-26T16:00:00.000Z" },
      { "id": "WpVwsFd8u6xSuZKOw9rV", "breakdown": { "ROI": 3900, "Monthly Expenses ": 9800, "Tithes": 580, "Savings": 1044 }, "remainingMoney": 4176, "income": 19500, "businessId": "ryFeeYRFyTF7vJ0FuZXe", "weekOf": "2025-07-04T14:34:01.938Z", "clientId": "5MyScSNM6oUs3SlPqC0f" },
      { "id": "l1GfldUDyRTTrH1BSt3Q", "breakdown": { "ROI": 18600, "Savings": 1512, "Weekly Expenses": 4000, "Tithes": 840, "Daily Expenses": 0 }, "remainingMoney": 6048, "clientId": "5MyScSNM6oUs3SlPqC0f", "businessId": "McQpt7wHSz2XyEd268my", "income": 31000, "weekOf": "2025-07-04T14:18:26.712Z" },
      { "id": "zRCrEOTMnVKAAiTKv2Y6", "breakdown": { "Tithes": 1680, "Daily Expenses": 0, "Weekly Expenses": 4000, "ROI": 31200, "Savings": 3024 }, "weekOf": "2025-05-29T16:00:00.000Z", "remainingMoney": 12096, "businessId": "McQpt7wHSz2XyEd268my", "clientId": "5MyScSNM6oUs3SlPqC0f", "income": 52000 }
    ]
  }
}
export default function BackupsPage() {
  const { backupScheduleSettings, updateBackupScheduleSettings, restoreFromBackup } = useAppContext();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<BackupScheduleSettings>({
    isScheduleEnabled: false,
    frequency: 'daily',
    weeklyDay: 1, // Monday
    dayOfMonth: 1,
    backupTime: '02:00',
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [fileToRestore, setFileToRestore] = useState<any>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);


  useEffect(() => {
    if (backupScheduleSettings) {
      setSchedule(backupScheduleSettings);
    }
  }, [backupScheduleSettings]);

  const handleDownloadBackup = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(providedBackupData, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `rentpilot-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    toast({ title: "Backup Downloading", description: "Your data is being downloaded as a JSON file." });
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a valid JSON backup file.' });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result;
            if (typeof content !== 'string') throw new Error("File content is not readable.");
            const parsedData = JSON.parse(content);
            
            if (!parsedData.data || !parsedData.data.clients) {
                throw new Error("Invalid backup file structure.");
            }

            setFileToRestore(parsedData);
            setIsRestoreConfirmOpen(true);
        } catch (error) {
            console.error("Error parsing backup file:", error);
            toast({ variant: 'destructive', title: 'File error', description: "We couldn’t read that file. Please make sure it’s a valid RentPilot backup (.json)." });
        }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleRestoreConfirmed = async () => {
    if (!fileToRestore) return;
    setIsRestoreConfirmOpen(false);
    setIsRestoring(true);

    const result = await restoreFromBackup(fileToRestore);

    if (result.success) {
        toast({ title: 'Restore Complete', description: 'Your application data has been restored.' });
    }
    // Error toast is handled inside the context function
    
    setIsRestoring(false);
    setFileToRestore(null);
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    await updateBackupScheduleSettings(schedule);
    setIsSaving(false);
  };

  const handlePushBackup = async () => {
    setIsPushing(true);
    toast({ title: "Pushing backup to Google Drive...", description: "This may take a moment." });

    const result = await pushBackupToGoogleDrive(providedBackupData);

    if (result.success && result.fileUrl) {
      toast({
          title: "Backup Successful!",
          description: "Your data has been pushed to Google Drive.",
          action: (
              <a href={result.fileUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View File
              </a>
          ),
      });
    } else {
        toast({
            variant: "destructive",
            title: "Backup Failed",
            description: result.error || "An unknown error occurred.",
            duration: 9000,
        });
    }
    setIsPushing(false);
  };
  

  return (
    <>
    <div className="container mx-auto py-2 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <DatabaseBackup className="mr-3 h-8 w-8 text-primary" />
          Backup & Restore
        </h1>
        <p className="text-muted-foreground">Manage your application data backups and system restore points.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <HardDriveDownload className="w-5 h-5 text-primary" />
                      Manual Local Backup
                  </CardTitle>
                  <CardDescription>
                      Download a snapshot of your current data to your local machine.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={handleDownloadBackup} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download Full Backup
                  </Button>
              </CardContent>
          </Card>
          
          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <UploadCloud className="w-5 h-5 text-primary" />
                      Manual Cloud Backup
                  </CardTitle>
                  <CardDescription>
                      Push a complete data snapshot to your configured Google Drive.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <Button onClick={handlePushBackup} disabled={isPushing} className="w-full">
                      {isPushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloud className="mr-2 h-4 w-4" />}
                      Push to Google Drive
                  </Button>
              </CardContent>
          </Card>


          <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <HardDriveUpload className="w-5 h-5 text-primary" />
                      Restore from Backup
                  </CardTitle>
                  <CardDescription>
                      Upload a JSON backup file to restore application data.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="backup-file">Backup File (.json)</Label>
                        <Input id="backup-file" type="file" accept=".json" onChange={handleFileSelect} ref={fileInputRef} disabled={isRestoring} />
                    </div>
                    {isRestoring && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Restoring data... Please do not navigate away.
                        </div>
                    )}
                </div>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" />
            Automated Backups
          </CardTitle>
          <CardDescription>
            Configure a schedule for automatic cloud backups to Google Drive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Developer Note</AlertTitle>
              <AlertDescription>
                The automated scheduling UI is for demonstration. The background function to execute these scheduled backups via your Google Apps Script is not yet implemented. Manual cloud backups are functional.
              </AlertDescription>
          </Alert>
          <div className="flex items-center space-x-2">
            <Switch
              id="schedule-enabled"
              checked={schedule.isScheduleEnabled}
              onCheckedChange={(checked) => setSchedule(p => ({...p, isScheduleEnabled: checked}))}
              disabled
            />
            <Label htmlFor="schedule-enabled" className="text-muted-foreground">Enable Automatic Backups (Coming Soon)</Label>
          </div>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will <strong className="text-destructive">completely overwrite</strong> all current application data with the content from the backup file. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setFileToRestore(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestoreConfirmed} className={cn(buttonVariants({ variant: "destructive" }))}>
                    Yes, overwrite everything
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
