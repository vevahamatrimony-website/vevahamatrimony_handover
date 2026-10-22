
const fs = require('fs');
const xml2js = require('xml2js');

// Function to parse XML file and convert to member data
async function parseXMLFile(filePath) {
    try {
        console.log('📊 Reading XML file:', filePath);
        
        // Read the XML file
        const xmlData = fs.readFileSync(filePath, 'utf8');
        
        // Parse XML to JSON
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        
        // Extract worksheet data
        const worksheet = result.Workbook.Worksheet[0];
        const table = worksheet.Table[0];
        const rows = table.Row;
        
        console.log('📋 Found', rows.length - 1, 'member records (excluding header)');
        
        // Extract headers from first row
        const headerRow = rows[0];
        const headers = headerRow.Cell.map(cell => {
            if (cell.Data && cell.Data[0] && cell.Data[0]._) {
                return cell.Data[0]._;
            }
            return '';
        });
        
        console.log('📋 Headers found:', headers.length);
        
        // Process data rows (skip header row)
        const members = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row.Cell) continue;
            
            const member = {
                matrimonyId: generateMatrimonyId(i - 1),
                rawIndex: i
            };
            
            // Map each cell to member properties
            row.Cell.forEach((cell, colIndex) => {
                if (!cell.Data || !cell.Data[0]) return;
                
                const value = cell.Data[0]._ || cell.Data[0];
                if (!value || value === 'none' || value === '-' || value === 'N/A') return;
                
                const header = headers[colIndex];
                if (!header) return;
                
                // Map Tamil headers to English properties
                const headerLower = header.toLowerCase();
                
                if (headerLower === 'gender') {
                    member.gender = value;
                } else if (headerLower === 'பெயர்' || headerLower.includes('பெயர்')) {
                    member.name = value;
                } else if (headerLower === 'பிறந்த தேதி' || headerLower.includes('பிறந்த தேதி')) {
                    member.birthDate = value;
                } else if (headerLower === 'பிறந்த நேரம்' || headerLower.includes('பிறந்த நேரம்')) {
                    member.birthTime = value;
                } else if (headerLower === 'பிறந்த இடம்' || headerLower.includes('பிறந்த இடம்')) {
                    member.birthPlace = value;
                } else if (headerLower === 'age') {
                    member.age = value;
                } else if (headerLower === 'caste') {
                    member.caste = value;
                } else if (headerLower === 'கோத்ரம்' || headerLower.includes('கோத்ரம்')) {
                    member.gotra = value;
                } else if (headerLower === 'இராசி' || headerLower.includes('இராசி')) {
                    member.rasi = value;
                } else if (headerLower === 'நட்சத்திரம்' || headerLower.includes('நட்சத்திரம்')) {
                    member.star = value;
                } else if (headerLower === 'லக்கினம்' || headerLower.includes('லக்கினம்')) {
                    member.lagnam = value;
                } else if (headerLower === 'சொந்த ஊர்' || headerLower.includes('சொந்த ஊர்')) {
                    member.nativePlace = value;
                } else if (headerLower === 'குலதெய்வம்' || headerLower.includes('குலதெய்வம்')) {
                    member.kulaDeivam = value;
                } else if (headerLower === 'உயரம்' || headerLower.includes('உயரம்')) {
                    member.height = value;
                } else if (headerLower === 'காம்ப்ளக்‌ஷன்' || headerLower.includes('காம்ப்ளக்‌ஷன்')) {
                    member.complexion = value;
                } else if (headerLower === 'கல்வித்தகுதி' || headerLower.includes('கல்வித்தகுதி')) {
                    member.education = value;
                } else if (headerLower === 'வேலை' || headerLower.includes('வேலை')) {
                    member.job = value;
                } else if (headerLower === 'monthly income') {
                    member.monthlyIncome = value;
                } else if (headerLower === 'father name') {
                    member.fatherName = value;
                } else if (headerLower === 'தந்தை வேலை' || headerLower.includes('தந்தை வேலை')) {
                    member.fatherOccupation = value;
                } else if (headerLower === 'mother name') {
                    member.motherName = value;
                } else if (headerLower === 'sister') {
                    member.sisters = value;
                } else if (headerLower === 'brother') {
                    member.brothers = value;
                } else if (headerLower === 'property') {
                    member.property = value;
                } else if (headerLower === 'contact address') {
                    member.contactAddress = value;
                } else if (headerLower === 'location') {
                    member.location = value;
                } else if (headerLower === 'contact phone number') {
                    member.phoneNumbers = value;
                } else if (headerLower === 'expectation') {
                    member.expectations = value;
                } else if (headerLower === 'others') {
                    member.others = value;
                }
            });
            
            // Only add members with essential data
            if (member.name && member.name.trim() && member.name !== 'BELOW 6 ENTRIES NOT CLEAR IN SOURCE') {
                members.push(member);
            }
        }
        
        console.log('✅ Successfully parsed', members.length, 'valid members from XML');
        return members;
        
    } catch (error) {
        console.error('❌ Error parsing XML file:', error);
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
function saveMembersToJSON(members, outputPath = 'xml-members-data.json') {
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
    parseXMLFile,
    saveMembersToJSON,
    generateMatrimonyId
};
