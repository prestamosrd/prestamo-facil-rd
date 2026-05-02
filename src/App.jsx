// ===================== IMPORTS =====================
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

// ===================== FIREBASE =====================
const firebaseConfig = {
  apiKey: "AIzaSyAmHBYrPGipQ3Qk5ttGkaYmiY0b04lZfLg",
  authDomain: "prestamos-eye.firebaseapp.com",
  projectId: "prestamos-eye",
  storageBucket: "prestamos-eye.firebasestorage.app",
  messagingSenderId: "710212000102",
  appId: "1:710212000102:web:ca2b0ee925202f829490a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===================== CONFIG =====================
const CONFIG_DEFAULT = {
  nombreApp: "Préstamos E & F",
  clave: "1234"
};

// ===================== APP =====================
function App() {
  const [clientes, setClientes] = useState([]);
  const [papelera, setPapelera] = useState([]);
  const [clave, setClave] = useState("");
  const [aut, setAut] = useState(
    sessionStorage.getItem("login") === "ok"
  );

  const [config, setConfig] = useState(() =>
    JSON.parse(localStorage.getItem("config")) || CONFIG_DEFAULT
  );

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    monto: "",
    cuotas: 15,
    mora: 1
  });

  // ===================== LOAD =====================
  const cargar = async () => {
    const c = await getDocs(collection(db, "clientes"));
    const p = await getDocs(collection(db, "papelera"));

    setClientes(c.docs.map(d => ({ id: d.id, ...d.data() })));
    setPapelera(p.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    cargar();
  }, []);

  // ===================== UTIL =====================
  const dinero = v =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP"
    }).format(v || 0);

  // ===================== LOGIN =====================
  const entrar = () => {
    if (clave === config.clave) {
      sessionStorage.setItem("login", "ok");
      setAut(true);
    } else alert("Clave incorrecta");
  };

  // ===================== SAVE =====================
  const guardar = async () => {
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

    setForm({
      nombre: "",
      telefono: "",
      monto: "",
      cuotas: 15,
      mora: 1
    });

    cargar();
  };

  // ===================== PAGAR =====================
  const pagar = async c => {
    await updateDoc(doc(db, "clientes", c.id), {
      pagado: (c.pagado || 0) + 1
    });
    cargar();
  };

  // ===================== PAPELERA =====================
  const moverPapelera = async c => {
    await addDoc(collection(db, "papelera"), c);
    await deleteDoc(doc(db, "clientes", c.id));
    cargar();
  };

  const restaurar = async c => {
    await addDoc(collection(db, "clientes"), c);
    await deleteDoc(doc(db, "papelera", c.id));
    cargar();
  };

  // ===================== WHATSAPP (OCULTO) =====================
  const enviarWhatsApp = c => {
    const msg = `📌 *PAGO SEMANAL*

👤 Cliente: ${c.nombre}

💵 Cuota: ${dinero(c.cuota)}

📅 Fecha: ${new Date().toLocaleDateString()}

Gracias.`;

    window.open(
      `https://wa.me/1${c.telefono}?text=${encodeURIComponent(msg)}`
    );
  };

  // ===================== LOGIN UI =====================
  if (!aut) {
    return (
      <div style={{ padding: 40 }}>
        <h1>{config.nombreApp}</h1>
        <input
          type="password"
          placeholder="Clave"
          onChange={e => setClave(e.target.value)}
        />
        <button onClick={entrar}>Entrar</button>
      </div>
    );
  }

  // ===================== APP UI =====================
  return (
    <div style={{ padding: 20 }}>
      <h1>{config.nombreApp}</h1>

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

      <h2>Clientes</h2>

      {clientes.map(c => (
        <div key={c.id} style={{ border: "1px solid #ccc", marginTop: 10 }}>
          <h3>{c.nombre}</h3>
          <p>{dinero(c.monto)}</p>
          <p>Cuota: {dinero(c.cuota)}</p>

          <button onClick={() => pagar(c)}>Pagar</button>
          <button onClick={() => enviarWhatsApp(c)}>WhatsApp</button>
          <button onClick={() => moverPapelera(c)}>Eliminar</button>
        </div>
      ))}

      <hr />

      <h2>Papelera</h2>

      {papelera.map(c => (
        <div key={c.id}>
          <p>{c.nombre}</p>
          <button onClick={() => restaurar(c)}>Restaurar</button>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
