import { useState } from 'react';
import api from './api';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje('Intentando conectar...');
    try {
      const response = await api.post('/auth/authenticate', { email, password });
      setMensaje('¡CONECTADO! Token recibido.');
      console.log('Token:', response.data.token);
    } catch (error) {
      if (!error.response) {
        setMensaje('Error de red: ¿Está el Backend prendido y con CORS habilitado?');
      } else {
        setMensaje('Error ' + error.response.status + ': Credenciales o Permisos');
      }
      console.error('Detalle:', error.response);
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>BaezPOS</h1>
      <form onSubmit={handleLogin} style={{ display: 'inline-block', textAlign: 'left' }}>
        <div>
          <label>Email:</label><br/>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div><br/>
        <div>
          <label>Password:</label><br/>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div><br/>
        <button type="submit" style={{ width: '100%', padding: '10px', cursor: 'pointer' }}>Ingresar</button>
      </form>
      {mensaje && <p style={{ color: 'red', fontWeight: 'bold' }}>{mensaje}</p>}
    </div>
  );
}

export default App;