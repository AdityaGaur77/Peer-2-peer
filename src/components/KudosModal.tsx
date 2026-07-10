import { useState, type FormEvent } from 'react';
import { useStore } from '../lib/store';
import type { Tutor } from '../lib/types';
import { Modal } from './Modal';

export function KudosModal({ tutor, onClose }: { tutor: Tutor; onClose: () => void }) {
  const { addKudos, requireProfile } = useStore();
  const [msg, setMsg] = useState('');

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (msg.trim().length < 3) return;
    const message = msg.trim();
    requireProfile((p) => {
      addKudos(tutor.id, p.name.split(' ')[0], message);
      onClose();
    });
  };

  return (
    <Modal onClose={onClose} labelledBy="thank-title">
      <div className="stack" style={{ gap: 6 }}>
        <h2 id="thank-title" className="h3">
          Thank {tutor.name.split(' ')[0]}
        </h2>
        <p className="muted" style={{ fontSize: 14.5 }}>
          Kudos show up on their tutor card and on the wall of thank-you. Make their week.
        </p>
      </div>
      <form className="stack" style={{ gap: 14 }} onSubmit={send}>
        <textarea
          className="textarea"
          placeholder="You made loops actually make sense…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          autoFocus
        />
        <button className="btn btn-primary" type="submit" disabled={msg.trim().length < 3}>
          Send kudos ♥
        </button>
      </form>
    </Modal>
  );
}
