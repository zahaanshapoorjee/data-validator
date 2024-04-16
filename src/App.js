import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Combined state for each patient's data, including ground truth and LLM predictions
  const [patientsData, setPatientsData] = useState(null); // Initialize to empty array

  // Fetch initial data from the backend
  useEffect(() => {
    fetchUncorrectedAnnotations();
  }, []);
  const [userName, setUserName] = useState('');
  const fetchUncorrectedAnnotations = () => {
    fetch('http://localhost:8080/uncorrected-annotations')
      .then(response => response.json())
      .then(data => {
        setPatientsData(data);
        console.log(data)
        // Assuming data is not empty, set corrections for the first patient
        if (data.length > 0) {
          setCorrections(data);
        }
        setCurrentPage(0); // Reset to the first page of new data
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };
  // Index of the current patient to display
  const [currentPage, setCurrentPage] = useState(0);

  // Separate state for corrections, initialized as a copy of the LLM prediction
  const [corrections, setCorrections] = useState([]);

  

  // Function to handle next page button click
  const handleNextPage = () => {
    if (currentPage < patientsData.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Function to handle previous page button click
  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Function to handle corrections change
// Function to handle corrections change
// Function to handle corrections change
const handleCorrectionChange = (correctionIndex, column, value) => {
  console.log("old", corrections);

  const updatedCorrections = corrections.map((correction, index) => {
      if (index === currentPage) {  // Check if we are modifying the correction for the current page
          // Parsing extracted_drugs JSON string into an array
          let extractedDrugs = [];
          try {
              extractedDrugs = JSON.parse(correction.extracted_drugs.replace(/'/g, '"'));  // Ensure all single quotes are replaced by double quotes
          } catch (error) {
              console.error("Failed to parse extracted_drugs:", error);
              // Optionally handle the error more gracefully here
              return correction;  // Return the current correction unmodified in case of parsing failure
          }

          return {
              ...correction,  // Spread existing correction object
              extracted_drugs: JSON.stringify(extractedDrugs.map((drug, idx) => {
                  if (idx === correctionIndex) {  // Find the specific drug entry that needs update
                      return {
                          ...drug,
                          [column]: value  // Update the specific column with new value
                      };
                  }
                  return drug;  // Return unmodified drug for other indices
              }))
          };
      }
      return correction;  // Return unmodified correction for other pages
  });

  console.log("new", updatedCorrections);
  setCorrections(updatedCorrections);  // Set the state to the new corrections array
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
  
    // It seems you're intending to stringify the 'corrections' array.
    // Make sure that's what your backend expects.
    const correctionsData = JSON.stringify({
      userName,
      patient_id: patientInfo.patient_id,
      prescription: patientInfo.prescription,
      extracted_drugs: JSON.stringify(corrections[currentPage].extracted_drugs),
    });
  
    fetch('http://localhost:8080/annotations', {
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
      // The backend could potentially return data that might be useful here.
      // For now, assuming it's logging purposes.
      console.log('Data sent successfully:', data);
      
      // Since we're updating based on the current page, 
      // we need to filter out the submitted patient's data.
      const updatedPatientsData = patientsData.filter((_, index) => index !== currentPage);
      setPatientsData(updatedPatientsData);
      
      // If there are no more patients to correct, fetch more.
      if (updatedPatientsData.length === 0) {
        fetchUncorrectedAnnotations();
      } else {
        // Adjust the current page if the last patient was corrected.
        setCurrentPage(prev => prev > 0 ? prev - 1 : 0);
        // Update corrections for the next patient.
      }
    })
    .catch(error => {
      // It's important to handle errors and possibly display a message to the user.
      console.error('Error:', error.message);
    });
  };
  






  return (
    <div className="App">
      <div className="content-container">
      <input
          style={{ position: 'absolute', left: 0, top: 0, margin: '10px' }}
          type="text"
          placeholder="Enter your name"
          value={userName}
          onChange={e => setUserName(e.target.value)}
        />
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

// Non-editable table component
const Table = ({ data }) => {

  // Attempt to parse the 'extracted_drugs' string into an array
  let drugs = [];
  try {
    drugs = JSON.parse(data.extracted_drugs.replace(/'/g, '"')); // replacing single quotes with double quotes for valid JSON
  } catch (error) {
    console.error("Failed to parse extracted drugs:", error);
    // Optionally handle the error more gracefully here
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


// Editable table component
const EditableTable = ({ data, onCorrectionChange, toggleCompletion }) => {
  // Attempt to parse the 'extracted_drugs' string into an array
  let drugs = [];
  try {
    drugs = JSON.parse(data.extracted_drugs.replace(/'/g, '"')); // replacing single quotes with double quotes for valid JSON
  } catch (error) {
    console.error("Failed to parse extracted drugs:", error);
    // Optionally handle the error more gracefully here
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
        </tr>
      </thead>
      <tbody>
        {drugs.map((row, index) => (
          <tr key={index}>
            <td>
              <input
                type="checkbox"
                checked={row.isCompleted || false} // ensure default as false if isCompleted isn't defined
                onChange={() => toggleCompletion(index)}
                disabled={index > 0 && !drugs[index - 1].isCompleted}
              />
            </td>
            {Object.entries(row).map(([column, value]) => {
              if (column !== 'isCompleted') {
                return (
                  <td key={column}>
                    <input
                      type="text"
                      value={value!=""?value:"NA"}
                      onChange={(e) => onCorrectionChange(index, column, e.target.value)}
                      disabled={!row.isCompleted && (index > 0 && !drugs[index - 1].isCompleted)}
                    />
                  </td>
                );
              }
              return null;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};


export default App;