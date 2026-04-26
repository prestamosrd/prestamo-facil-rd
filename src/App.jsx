import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [clientes, setClientes] = useState(() => {
    return JSON.parse(localStorage.getItem("clientesPrestamos") || "[]");
  });

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    monto: "",
    cuotas: 15,
    ganancia: 60,
    mora: 100
  });

  useEffect(() => {
    localStorage.setItem("clientesPrestamos", JSON.stringify(clientes));
  }, [clientes]);

  const dinero = (valor) =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP"
    }).format(valor || 0);

  const guardar = () => {
    if (!form.nombre || !form.telefono || !form.monto || !form.cuotas) {
      alert("Completa nombre, teléfono, monto y cuotas.");
      return;
    }

    const monto = Number(form.monto);
    const cuotas = Number(form.cuotas);
    const ganancia = Number(form.ganancia);
    const mora = Number(form.mora);
    const total = monto * (1 + ganancia / 100);
    const pagoSemanal = total / cuotas;

    const nuevo = {
      id: Date.now(),
      ...form,
      monto,
      cuotas,
      ganancia,
      mora,
      total,
      pagoSemanal,
      pagado: 0,
      moraTotal: 0
    };

    setClientes([nuevo, ...clientes]);
    setForm({ nombre: "", telefono: "", monto: "", cuotas: 15, ganancia: 60, mora: 100 });
  };

  const pagarCuota = (id) => {
    setClientes(clientes.map(c => {
      if (c.id === id && c.pagado < c.cuotas) {
        return { ...c, pagado: c.pagado + 1 };
      }
      return c;
    }));
  };

  const aplicarMora = (id) => {
    setClientes(clientes.map(c => {
      if (c.id === id) {
        return { ...c, moraTotal: c.moraTotal + c.mora };
      }
      return c;
    }));
  };

  const eliminar = (id) => {
    if (confirm("¿Seguro que deseas eliminar este préstamo?")) {
      setClientes(clientes.filter(c => c.id !== id));
    }
  };

  const enviarWhatsApp = (cliente) => {
    const pendiente = cliente.total + cliente.moraTotal - cliente.pagado * cliente.pagoSemanal;
    const tel = cliente.telefono.replace(/\D/g, "");
    const mensaje = encodeURIComponent(
      `Hola ${cliente.nombre}, su cuota semanal es de ${dinero(cliente.pagoSemanal)}. Balance pendiente: ${dinero(pendiente)}.`
    );
    window.open(`https://wa.me/1${tel}?text=${mensaje}`, "_blank");
  };

  const resumen = clientes.reduce((acc, c) => {
    acc.prestado += c.monto;
    acc.cobrar += c.total + c.moraTotal;
    acc.pagado += c.pagado * c.pagoSemanal;
    acc.pendiente += c.total + c.moraTotal - c.pagado * c.pagoSemanal;
    return acc;
  }, { prestado: 0, cobrar: 0, pagado: 0, pendiente: 0 });

  return (
    <div style={{ padding: 16, fontFamily: "Arial", background: "#f1f5f9", minHeight: "100vh" }}>
      <div style={{ background: "#7f1d1d", color: "white", padding: 20, borderRadius: 20 }}>
        <h1>Préstamo Fácil RD</h1>
        <p>Control de préstamos, cuotas semanales y mora.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 15 }}>
        <Box titulo="Clientes" valor={clientes.length} />
        <Box titulo="Prestado" valor={dinero(resumen.prestado)} />
        <Box titulo="A cobrar" valor={dinero(resumen.cobrar)} />
        <Box titulo="Pendiente" valor={dinero(resumen.pendiente)} />
      </div>

      <div style={{ background: "white", padding: 16, borderRadius: 20, marginTop: 15 }}>
        <h2>Nuevo préstamo</h2>

        <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
        <input placeholder="Monto prestado" type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
        <input placeholder="Cantidad de cuotas" type="number" value={form.cuotas} onChange={e => setForm({ ...form, cuotas: e.target.value })} />
        <input placeholder="% Ganancia" type="number" value={form.ganancia} onChange={e => setForm({ ...form, ganancia: e.target.value })} />
        <input placeholder="Mora por atraso" type="number" value={form.mora} onChange={e => setForm({ ...form, mora: e.target.value })} />

        <button onClick={guardar}>Guardar préstamo</button>
      </div>

      {clientes.map(c => {
        const pagado = c.pagado * c.pagoSemanal;
        const pendiente = c.total + c.moraTotal - pagado;

        return (
          <div key={c.id} style={{ background: "white", padding: 16, borderRadius: 20, marginTop: 15 }}>
            <h2>{c.nombre}</h2>
            <p>📞 {c.telefono}</p>
            <p>Monto prestado: <b>{dinero(c.monto)}</b></p>
            <p>Total a cobrar: <b>{dinero(c.total)}</b></p>
            <p>Pago semanal: <b>{dinero(c.pagoSemanal)}</b></p>
            <p>Cuotas pagadas: <b>{c.pagado} / {c.cuotas}</b></p>
            <p>Mora acumulada: <b>{dinero(c.moraTotal)}</b></p>
            <p>Pendiente: <b>{dinero(pendiente)}</b></p>

            <button onClick={() => pagarCuota(c.id)}>Marcar cuota pagada</button>
            <button onClick={() => aplicarMora(c.id)}>Aplicar mora</button>
            <button onClick={() => enviarWhatsApp(c)}>WhatsApp</button>
            <button onClick={() => eliminar(c.id)} style={{ background: "#dc2626" }}>Eliminar</button>
          </div>
        );
      })}

      <style>{`
        input {
          width: 100%;
          padding: 12px;
          margin: 6px 0;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
          font-size: 16px;
        }
        button {
          width: 100%;
          padding: 12px;
          margin-top: 8px;
          border: none;
          border-radius: 12px;
          background: #7f1d1d;
          color: white;
          font-weight: bold;
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}

function Box({ titulo, valor }) {
  return (
    <div style={{ background: "white", padding: 14, borderRadius: 16 }}>
      <small>{titulo}</small>
      <h3>{valor}</h3>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
