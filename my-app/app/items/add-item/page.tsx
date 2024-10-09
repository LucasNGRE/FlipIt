import AddItem from '@/components/items/add-item'
import React from 'react'
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publier une annonce | FlipIt",
  description: "Un espace pour ajouter un article à vendre",
};

const AddItemPage = () => {
  return (
    <div>
        <AddItem />
    </div>
  )
}

export default AddItemPage