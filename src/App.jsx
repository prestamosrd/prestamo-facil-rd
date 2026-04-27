import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

// 🔥 FIREBASE
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

// 🔐 CONFIG
const CONFIG_DEFAULT = {
  nombreApp: "Préstamos E & F",
  clave: "1234"
};

function App() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [clave, setClave] = useState("");
  const [autenticado, setAutenticado] = useState(
    () => sessionStorage.getItem("login") === "ok"
  );

  const [config, setConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("config")) || CONFIG_DEFAULT;
    } catch {
      return CONFIG_DEFAULT;
    }
  });

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    monto: ""
  });

  useEffect(() => {
    localStorage.setItem("config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setCargando(true);
    const snap = await getDocs(collection(db, "clientes"));
    const data = [];
    snap.forEach(d => data.push({ id: d.id, ...d.data() }));
    setClientes(data);
    setCargando(false);
  };

  const dinero = v =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP"
    }).format(v || 0);

  const entrar = () => {
    if (clave === config.clave) {
      sessionStorage.setItem("login", "ok");
      setAutenticado(true);
    } else {
      alert("Clave incorrecta");
    }
  };

  const guardar = async () => {
    if (!form.nombre || !form.telefono || !form.monto) return;

    const monto = Number(form.monto);

    await addDoc(collection(db, "clientes"), {
      nombre: form.nombre,
      telefono: form.telefono,
      monto,
      creado: new Date().toISOString(),
      server: serverTimestamp()
    });

    setForm({ nombre: "", telefono: "", monto: "" });
    cargar();
  };

  const eliminar = async c => {
    if (!confirm("¿Eliminar préstamo?")) return;
    await deleteDoc(doc(db, "clientes", c.id));
    cargar();
  };

  const whatsapp = c => {
    const msg = `📌 COBRO\n\nCliente: ${c.nombre}\nMonto: ${dinero(
      c.monto
    )}`;
    window.open(
      `https://wa.me/1${c.telefono}?text=${encodeURIComponent(msg)}`
    );
  };

  if (!autenticado) {
    return (
      <div style={{ padding: 40 }}>
        <h1>{config.nombreApp}</h1>
        <input
          type="password"
          placeholder="Contraseña"
          value={clave}
          onChange={e => setClave(e.target.value)}
        />
        <button onClick={entrar}>Entrar</button>
      </div>
    );
  }

  if (cargando) return <h2>Cargando...</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h1>{config.nombreApp} (NUBE)</h1>

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

      {clientes.map(c => (
        <div key={c.id} style={{ border: "1px solid #ccc", marginTop: 10 }}>
          <h3>{c.nombre}</h3>
          <p>{dinero(c.monto)}</p>

          <button onClick={() => whatsapp(c)}>WhatsApp</button>
          <button onClick={() => eliminar(c)}>Eliminar</button>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
