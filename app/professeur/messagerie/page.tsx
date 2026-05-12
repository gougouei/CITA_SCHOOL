"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfesseurMesseriePage() {
  return (
    <>
      <header className="bg-white border-b border-border px-8 py-5">
        <h1 className="font-serif text-2xl font-semibold text-[#141414]">Messagerie</h1>
      </header>
      <div className="p-8">
        <div className="grid grid-cols-2 gap-6 max-[900px]:grid-cols-1">
          {/* Conversations list */}
          <Card>
            <CardHeader className="px-6 py-5 border-b border-border">
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <div className="p-2">
              <ConversationItem
                initials="IN"
                name="Initiation Niveau 1"
                lastMessage="Merci professeur..."
                time="14:32"
                unread={3}
              />
            </div>
          </Card>

          {/* Chat window */}
          <Card>
            <div className="bg-citsa-black px-6 py-5 flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-white">Chat</h3>
            </div>
            <div className="min-h-[200px] bg-secondary" />
            <div className="px-4 py-3 border-t border-border flex gap-2">
              <input
                type="text"
                placeholder="Message..."
                className="flex-1 font-sans text-sm bg-white border border-border rounded-md px-[0.875rem] h-10 outline-none focus:border-citsa-red-hex transition-all"
              />
              <Button variant="accent">Envoyer</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function ConversationItem({
  initials, name, lastMessage, time, unread,
}: {
  initials: string; name: string; lastMessage: string; time: string; unread?: number;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg cursor-pointer hover:bg-muted-bg transition-colors">
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-citsa-red-light to-citsa-red flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-[0.8rem] text-muted-fg truncate">{lastMessage}</div>
      </div>
      <div className="text-right">
        <div className="text-[0.7rem] text-muted-fg">{time}</div>
        {unread && unread > 0 && (
          <span className="mt-1 inline-block bg-citsa-red-hex text-white text-[0.65rem] font-bold px-[0.4rem] py-[0.15rem] rounded-full">
            {unread}
          </span>
        )}
      </div>
    </div>
  );
}
