import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [patientsData, setPatientsData] = useState(null);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [corrections, setCorrections] = useState([]);


  const handleUsernameChange = (event) => {
    setUserName(event.target.value);
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  useEffect(() => {
    fetchUncorrectedAnnotations();
  }, []);

  const handleLogin = async () => {
    const response = await fetch('https://data-validator-backend.onrender.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, password }),
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('name', userName);
      setIsLoggedIn(true);
    } else {
      alert('Login failed: ' + data.message);
    }
  };

  const fetchUncorrectedAnnotations = () => {
    fetch('https://data-validator-backend.onrender.com/uncorrected-annotations')
      .then(response => response.json())
      .then(data => {
        setPatientsData(data);
        if (data.length > 0) {
          setCorrections(data);
        }
        setCurrentPage(0); 
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };
  

  const handleNextPage = () => {
    if (currentPage < patientsData.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

const handleCorrectionChange = (correctionIndex, column, value) => {

  const updatedCorrections = corrections.map((correction, index) => {
      if (index === currentPage) {  
          let extractedDrugs = [];
          try {
              extractedDrugs = JSON.parse(correction.extracted_drugs.replace(/'/g, '"'));  
          } catch (error) {
              console.error("Failed to parse extracted_drugs:", error);
              return correction;  
          }

          return {
              ...correction,  
              extracted_drugs: JSON.stringify(extractedDrugs.map((drug, idx) => {
                  if (idx === correctionIndex) { 
                      return {
                          ...drug,
                          [column]: value  
                      };
                  }
                  return drug; 
              }))
          };
      }
      return correction;  
  });

  setCorrections(updatedCorrections); 
};



  const toggleCompletion = (index) => {
    const newCorrections = corrections.map((item, idx) => {
      if (idx === index) {
        return { ...item, isCompleted: !item.isCompleted };
      }
      return item;
    });
    setCorrections(newCorrections);
  };


  const handleSubmit = () => {
    const patientInfo = patientsData[currentPage];

    const correctionsData = JSON.stringify({
        userName,
        patient_id: patientInfo.patient_id,
        prescription: patientInfo.prescription,
        extracted_drugs: corrections[currentPage].extracted_drugs,
    });

    fetch('https://data-validator-backend.onrender.com/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: correctionsData,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to send data');
        }
        return response.json();
    })
    .then(data => {
        console.log('Data sent successfully:', data);
        const updatedPatientsData = patientsData.filter((_, index) => index !== currentPage);
        setPatientsData(updatedPatientsData);

        const updatedCorrections = corrections.filter((_, index) => index !== currentPage);
        setCorrections(updatedCorrections);

        if (updatedPatientsData.length === 0) {
            fetchUncorrectedAnnotations();
        } else {
            setCurrentPage(prev => prev > 0 ? prev - 1 : 0);
        }
    })
    .catch(error => {
        console.error('Error:', error.message);
    });
};



if (!isLoggedIn) {
  return (
    <div className="login-container">
      <input type="text" value={userName} onChange={handleUsernameChange} placeholder="Username" />
      <input type="password" value={password} onChange={handlePasswordChange} placeholder="Password" />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

  return (
    <div className="App">
      <div className="content-container">
      <h1 className="greeting">Hi, {userName}!</h1>
        <button onClick={handlePreviousPage} disabled={currentPage === 0}>Previous Page</button>
       {patientsData && <button onClick={handleNextPage} disabled={currentPage === patientsData.length - 1}>Next Page</button>}
        {/* {patientsData.length === 0 && (
        <button onClick={fetchUncorrectedAnnotations}>Fetch More</button>
      )} */}
    </div>
      {patientsData && (
        <div className="content-container" key={patientsData[currentPage].patient_id}>
          <div className="patient-info">
            <h2>Patient ID: {patientsData[currentPage].patient_id}</h2>
            <pre className="prescription-data">{patientsData[currentPage].prescription}</pre>
          </div>
          <h3>LLM Prediction</h3>
{patientsData!==null && (
  <Table data={patientsData[currentPage]} />
)}          <h3>Correction</h3>
          <EditableTable
        data={corrections[currentPage]}
        onCorrectionChange={handleCorrectionChange}
        toggleCompletion={toggleCompletion}
      />
        </div>
        
      )}
       <button
          onClick={handleSubmit}
          style={{
            backgroundColor: 'red',
            color: 'white',
            padding: '10px 20px',
            fontSize: '16px',
            borderRadius: '10px',
            cursor: 'pointer',
            // animation: 'pulse 2s infinite'
          }}
        >Submit</button>    
    </div>
  );
}

const Table = ({ data }) => {

  let drugs = [];
  try {
    drugs = JSON.parse(data.extracted_drugs.replace(/'/g, '"')); 
  } catch (error) {
    console.error("Failed to parse extracted drugs:", error);
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Dosage Form</th>
          <th>Strength</th>
          <th>Frequency</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {drugs.map((row, index) => (
          <tr key={index}>
            <td>{row.name}</td>
            <td>{row.dosage_form}</td>
            <td>{row.strength}</td>
            <td>{row.frequency}</td>
            <td>{row.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const EditableTable = ({ data, onCorrectionChange, toggleCompletion }) => {
  let drugs = [];
  try {
    drugs = JSON.parse(data.extracted_drugs.replace(/'/g, '"'));
  } catch (error) {
    console.error("Failed to parse extracted drugs:", error);
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Complete</th>
          <th>Name</th>
          <th>Dosage Form</th>
          <th>Strength</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Months</th>  
        </tr>
      </thead>
      <tbody>
        {drugs.map((row, index) => (
          <tr key={index}>
            <td>
              <input
                type="checkbox"
                checked={row.isCompleted || false}
                onChange={() => toggleCompletion(index)}
                // disabled={index > 0 && !drugs[index - 1].isCompleted}
              />
            </td>
            <td>
              <input
                type="text"
                value={row.name}
                onChange={(e) => onCorrectionChange(index, 'name', e.target.value)}
                // disabled={!row.isCompleted && (index > 0 && !drugs[index - 1].isCompleted)}
              />
            </td>
            <td>
              <input
                type="text"
                value={row.dosage_form}
                onChange={(e) => onCorrectionChange(index, 'dosage_form', e.target.value)}
                // disabled={!row.isCompleted && (index > 0 && !drugs[index - 1].isCompleted)}
              />
            </td>
            <td>
              <input
                type="text"
                value={row.strength}
                onChange={(e) => onCorrectionChange(index, 'strength', e.target.value)}
                // disabled={!row.isCompleted && (index > 0 && !drugs[index - 1].isCompleted)}
              />
            </td>
            <td>
              <input
                type="text"
                value={row.frequency}
                onChange={(e) => onCorrectionChange(index, 'frequency', e.target.value)}
                // disabled={!row.isCompleted && (index > 0 && !drugs[index - 1].isCompleted)}
              />
            </td>
            <td>
              <input
                type="text"
                value={row.duration}
                onChange={(e) => onCorrectionChange(index, 'duration', e.target.value)}
                // disabled={!row.isCompleted && (index > 0 && !drugs[index - 1].isCompleted)}
              />
            </td>
            <td>  
              <input
                type="text"
                value={row.months || 'N/A'}
                onChange={(e) => onCorrectionChange(index, 'months', e.target.value)}
                // disabled={!row.isCompleted && (index > 0 && !drugs[index - 1].isCompleted)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};



export default App;