import React from 'react'
import Setting from '@/components/settings/user_settings'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | FlipIt",
  description: "Change parameters of your account",
};


const Settings = () => {
  return (
    <div>
        <Setting />
    </div>
  )
}

export default Settings