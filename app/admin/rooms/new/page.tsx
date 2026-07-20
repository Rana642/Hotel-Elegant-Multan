import type { Metadata } from 'next';
import NewRoomForm from './NewRoomForm';

export const metadata: Metadata = { title: 'New Room' };

export default function NewRoomPage() {
  return (
    <div className="p-6 lg:p-10 mt-16 lg:mt-0">
      <h1 className="font-playfair font-semibold text-2xl text-[#1A0B2E] mb-8">Add New Room</h1>
      <NewRoomForm />
    </div>
  );
}
