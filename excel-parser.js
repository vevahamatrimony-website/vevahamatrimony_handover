
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Function to parse Excel file and return member data
function parseExcelFile(filePath) {
    try {
        console.log('📊 Reading Excel file:', filePath);
        
        // Read the Excel file
        const workbook = XLSX.readFile(filePath, { 
            type: 'file',
            codepage: 65001, // UTF-8 encoding for Tamil text
            cellText: true,
            cellDates: true
        });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Use first row as headers
            defval: '', // Default value for empty cells
            blankrows: false // Skip blank rows
        });
        
        if (jsonData.length < 2) {
            throw new Error('Excel file must have at least a header row and one data row');
        }
        
        // Extract headers and data
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);
        
        console.log('📋 Found headers:', headers);
        console.log('📊 Found', dataRows.length, 'member records');
        
        // Map data to structured member objects
        const members = dataRows.map((row, index) => {
            const member = {
                matrimonyId: generateMatrimonyId(index),
                rawIndex: index + 1
            };
            
            // Map each column to member properties
            headers.forEach((header, colIndex) => {
                const value = row[colIndex] || '';
                const cleanValue = typeof value === 'string' ? value.trim() : value;
                
                // Skip empty values
                if (!cleanValue || cleanValue === '-' || cleanValue === 'N/A') {
                    return;
                }
                
                // Map headers to member properties (case-insensitive)
                const headerLower = header.toLowerCase();
                
                if (headerLower.includes('gender') || headerLower.includes('பாலின')) {
                    member.gender = cleanValue;
                } else if (headerLower.includes('name') || headerLower.includes('பெயர்')) {
                    member.name = cleanValue;
                } else if (headerLower.includes('birth date') || headerLower.includes('பிறந்த தேதி')) {
                    member.birthDate = cleanValue;
                } else if (headerLower.includes('birth time') || headerLower.includes('பிறந்த நேரம்')) {
                    member.birthTime = cleanValue;
                } else if (headerLower.includes('birth place') || headerLower.includes('பிறந்த இடம்')) {
                    member.birthPlace = cleanValue;
                } else if (headerLower.includes('age')) {
                    member.age = cleanValue;
                } else if (headerLower.includes('caste') || headerLower.includes('ஜாதி')) {
                    member.caste = cleanValue;
                } else if (headerLower.includes('gotra') || headerLower.includes('கோத்ரம்')) {
                    member.gotra = cleanValue;
                } else if (headerLower.includes('rasi') || headerLower.includes('இராசி')) {
                    member.rasi = cleanValue;
                } else if (headerLower.includes('star') || headerLower.includes('நட்சத்திரம்')) {
                    member.star = cleanValue;
                } else if (headerLower.includes('height') || headerLower.includes('உயரம்')) {
                    member.height = cleanValue;
                } else if (headerLower.includes('education') || headerLower.includes('கல்வி')) {
                    member.education = cleanValue;
                } else if (headerLower.includes('job') || headerLower.includes('வேலை')) {
                    member.job = cleanValue;
                } else if (headerLower.includes('income') || headerLower.includes('வருமானம்')) {
                    member.monthlyIncome = cleanValue;
                } else if (headerLower.includes('father name') || headerLower.includes('தந்தை பெயர்')) {
                    member.fatherName = cleanValue;
                } else if (headerLower.includes('father occupation') || headerLower.includes('தந்தை தொழில்')) {
                    member.fatherOccupation = cleanValue;
                } else if (headerLower.includes('mother name') || headerLower.includes('தாய் பெயர்')) {
                    member.motherName = cleanValue;
                } else if (headerLower.includes('mother occupation') || headerLower.includes('தாய் தொழில்')) {
                    member.motherOccupation = cleanValue;
                } else if (headerLower.includes('siblings') || headerLower.includes('சகோதர')) {
                    member.siblings = cleanValue;
                } else if (headerLower.includes('property') || headerLower.includes('சொத்து')) {
                    member.property = cleanValue;
                } else if (headerLower.includes('address') || headerLower.includes('முகவரி')) {
                    member.address = cleanValue;
                } else if (headerLower.includes('location') || headerLower.includes('இடம்')) {
                    member.location = cleanValue;
                } else if (headerLower.includes('phone') || headerLower.includes('தொலைபேசி')) {
                    member.phoneNumbers = cleanValue;
                } else if (headerLower.includes('expectation') || headerLower.includes('எதிர்பார்ப்பு')) {
                    member.expectations = cleanValue;
                } else if (headerLower.includes('others') || headerLower.includes('மற்றவை')) {
                    member.others = cleanValue;
                }
            });
            
            return member;
        });
        
        // Filter out members without essential data (name)
        const validMembers = members.filter(member => member.name && member.name.trim());
        
        console.log('✅ Successfully parsed', validMembers.length, 'valid members from Excel');
        return validMembers;
        
    } catch (error) {
        console.error('❌ Error parsing Excel file:', error);
        throw error;
    }
}

// Generate unique matrimony ID
function generateMatrimonyId(index) {
    const timestamp = Date.now().toString().slice(-6);
    const memberNumber = String(index + 1).padStart(3, '0');
    return `VM${timestamp}${memberNumber}`;
}

// Function to save parsed data to JSON file
function saveMembersToJSON(members, outputPath = 'members-data.json') {
    try {
        const jsonString = JSON.stringify(members, null, 2);
        fs.writeFileSync(outputPath, jsonString, 'utf8');
        console.log(`💾 Saved ${members.length} members to ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('❌ Error saving JSON file:', error);
        throw error;
    }
}

module.exports = {
    parseExcelFile,
    saveMembersToJSON,
    generateMatrimonyId
};
