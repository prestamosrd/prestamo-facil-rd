import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAmHBYrPGipQ3Qk5ttGkaYmiY0b04lZfLg",
  authDomain: "prestamos-eye.firebaseapp.com",
  projectId: "prestamos-eye",
  storageBucket: "prestamos-eye.firebasestorage.app",
  messagingSenderId: "710212000102",
  appId: "1:710212000102:web:ca2b0ee925202f829490a7"
};

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

function App() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    monto: "",
    cuotas: 15
  });

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    const snap = await getDocs(collection(db, "clientes"));
    const data = [];
    snap.forEach(d => data.push({ id: d.id, ...d.data() }));
    setClientes(data);
  };

  const dinero = v =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP"
    }).format(v || 0);

  const guardar = async () => {
    if (!form.nombre || !form.telefono || !form.monto) return;

    const monto = Number(form.monto);
    const total = monto * 1.6;
    const cuota = total / form.cuotas;

    await addDoc(collection(db, "clientes"), {
      ...form,
      monto,
      total,
      cuota,
      pagado: 0,
      creado: new Date().toISOString(),
      server: serverTimestamp()
    });

    setForm({ nombre: "", telefono: "", monto: "", cuotas: 15 });
    cargar();
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar préstamo?")) return;
    await deleteDoc(doc(db, "clientes", id));
    cargar();
  };

  const pagar = async (c) => {
    await updateDoc(doc(db, "clientes", c.id), {
      pagado: (c.pagado || 0) + 1
    });
    cargar();
  };

  // 🔥 WHATSAPP OCULTO (AQUÍ ESTÁ EL CAMBIO)
  const enviarWhatsApp = (c) => {
    const mensaje = `📌 *PAGO SEMANAL*

👤 Cliente: ${c.nombre}

💵 Cuota: ${dinero(c.cuota)}

📅 Fecha: ${new Date().toLocaleDateString()}

Gracias.`;

    window.open(
      `https://wa.me/1${c.telefono}?text=${encodeURIComponent(mensaje)}`
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Préstamos E & F</h1>

      <h2>Nuevo préstamo</h2>

      <input
        placeholder="Nombre"
        value={form.nombre}
        onChange={e => setForm({ ...form, nombre: e.target.value })}
      />

      <input
        placeholder="Teléfono"
        value={form.telefono}
        onChange={e => setForm({ ...form, telefono: e.target.value })}
      />

      <input
        placeholder="Monto"
        value={form.monto}
        onChange={e => setForm({ ...form, monto: e.target.value })}
      />

      <button onClick={guardar}>Guardar</button>

      <hr />

      {clientes.map(c => (
        <div key={c.id} style={{ border: "1px solid #ccc", marginTop: 10 }}>
          <h3>{c.nombre}</h3>
          <p>{dinero(c.monto)}</p>
          <p>Cuota: {dinero(c.cuota)}</p>
          <p>Pagado: {c.pagado || 0}</p>

          <button onClick={() => pagar(c)}>Pagar</button>
          <button onClick={() => enviarWhatsApp(c)}>WhatsApp</button>
          <button onClick={() => eliminar(c.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
