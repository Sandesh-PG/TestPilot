'use client';

import { UserDetailContext } from "@/context/userDetail";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";

const Provider = ({ children, }: Readonly<{
    children: React.ReactNode;
}>) => {
    const { isSignedIn, isLoaded } = useUser();
    const [UserDetail, setUserDetail] = useState<any>();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            CreateNewUser();
        }
    }, [isLoaded, isSignedIn]);

    const CreateNewUser = async () => {
        try {
            const result = await axios.post('/api/users', {});
            if (result.status) {
                console.log("User sync result:", result.data);
                setUserDetail(result.data)
            }
        } catch (error) {
            console.error("Error syncing user to database:", error);
        }
    };

    return (
        <div>
            <UserDetailContext.Provider value={{ UserDetail, userDetail: UserDetail, setUserDetail }}>
                {children}
            </UserDetailContext.Provider>
        </div>
    );
};

export default Provider;
