const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Universal file parser for multiple database formats
class UniversalFileParser {
    constructor() {
        this.supportedFormats = ['.xlsx', '.xls', '.xml', '.json', '.sql', '.csv'];
    }

    // Main parsing function
    async parseFile(filePath, multiseriesConfig = null) {
        const extension = path.extname(filePath).toLowerCase();
        console.log(`📊 Parsing file: ${path.basename(filePath)} (${extension})`);
        
        // Load existing matrimony IDs to prevent duplicates
        this.loadExistingMatrimonyIds();
        
        // Validate and store multiseries config for use in ID generation
        this.multiseriesConfig = this.validateMultiseriesConfig(multiseriesConfig);
        console.log(`🆔 Using multiseries config:`, this.multiseriesConfig);

        switch (extension) {
            case '.xlsx':
            case '.xls':
                return this.parseExcelFile(filePath);
            case '.xml':
                return this.parseXMLFile(filePath);
            case '.json':
                return this.parseJSONFile(filePath);
            case '.sql':
                return this.parseSQLFile(filePath);
            case '.csv':
                return this.parseCSVFile(filePath);
            default:
                throw new Error(`Unsupported file format: ${extension}`);
        }
    }

    // Parse Excel files (.xlsx, .xls)
    parseExcelFile(filePath) {
        try {
            console.log('📊 Reading Excel file:', filePath);

            const workbook = XLSX.readFile(filePath, {
                type: 'file',
                codepage: 65001,
                cellText: true,
                cellDates: true
            });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: false
            });

            if (jsonData.length < 2) {
                throw new Error('Excel file must have at least a header row and one data row');
            }

            const headers = jsonData[0];
            const dataRows = jsonData.slice(1);

            console.log('📋 Found headers:', headers);
            console.log('📊 Found', dataRows.length, 'member records');

            return this.mapRowsToMembers(headers, dataRows, 'excel');

        } catch (error) {
            console.error('❌ Error parsing Excel file:', error);
            throw error;
        }
    }

    // Parse XML files
    async parseXMLFile(filePath) {
        try {
            console.log('📊 Reading XML file:', filePath);

            const xmlData = fs.readFileSync(filePath, 'utf8');
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xmlData);

            const members = [];

            // Handle Excel XML format with Workbook > Worksheet > Table > Row structure
            if (result.Workbook && result.Workbook.Worksheet) {
                const worksheet = Array.isArray(result.Workbook.Worksheet) ? result.Workbook.Worksheet[0] : result.Workbook.Worksheet;

                if (worksheet.Table && worksheet.Table[0] && worksheet.Table[0].Row) {
                    const rows = worksheet.Table[0].Row;

                    // Skip header row (first row)
                    for (let i = 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row.Cell) continue;

                        const cells = row.Cell;

                        // Skip rows with no actual data or just placeholders
                        if (!cells || cells.length < 3) continue;

                        const getCellValue = (index) => {
                            if (!cells[index] || !cells[index].Data || !cells[index].Data[0]) return '';
                            const value = cells[index].Data[0]._;
                            return value === 'none' || value === 'SOURCE NOT CLEAR' || !value ? '' : value.toString().trim();
                        };

                        const name = getCellValue(2); // பெயர்

                        // Skip rows without names or with placeholder names
                        if (!name || name.includes('BELOW') || name.includes('NOT CLEAR') || name.includes('எழுத்து சரியாக தெரியவில்லை')) {
                            continue;
                        }

                        const customPrefix = this.multiseriesConfig?.enabled ? this.multiseriesConfig.prefix : 'VM';
                        const matrimonyId = this.generateMatrimonyId(i - 1, customPrefix);

                        const member = {
                            matrimonyId,
                            rawIndex: i,
                            gender: getCellValue(1),
                            name: name,
                            birthDate: getCellValue(3),
                            birthTime: getCellValue(4),
                            birthPlace: getCellValue(5),
                            age: getCellValue(6),
                            caste: getCellValue(7),
                            gotra: getCellValue(8),
                            rasi: getCellValue(9),
                            star: getCellValue(10),
                            lagnam: getCellValue(11),
                            nativePlace: getCellValue(12),
                            kulaDeivam: getCellValue(13),
                            height: getCellValue(14),
                            complexion: getCellValue(15),
                            education: getCellValue(16),
                            job: getCellValue(17),
                            monthlyIncome: getCellValue(18),
                            fatherName: getCellValue(19),
                            fatherJob: getCellValue(20),
                            motherName: getCellValue(21),
                            sister: getCellValue(22),
                            brother: getCellValue(23),
                            property: getCellValue(24),
                            contactAddress: getCellValue(25),
                            location: getCellValue(26),
                            phoneNumbers: getCellValue(27),
                            expectations: getCellValue(28),
                            others: getCellValue(29)
                        };

                        // Clean up the member data
                        Object.keys(member).forEach(key => {
                            if (member[key] === '' || member[key] === 'none' || member[key] === 'SOURCE NOT CLEAR') {
                                member[key] = null;
                            }
                        });

                        members.push(member);
                    }
                }
            } else if (result.members && Array.isArray(result.members.member)) {
                // Standard member XML format
                result.members.member.forEach((memberData, index) => {
                    members.push(this.createMemberFromXMLData(memberData, index));
                });
            } else if (result.root && result.root.member) {
                // Root-based XML format
                const memberArray = Array.isArray(result.root.member) ? result.root.member : [result.root.member];
                memberArray.forEach((memberData, index) => {
                    members.push(this.createMemberFromXMLData(memberData, index));
                });
            }

            console.log('✅ Successfully parsed', members.length, 'valid members from XML');
            return members.filter(member => member.name && member.name.trim());

        } catch (error) {
            console.error('❌ Error parsing XML file:', error);
            throw error;
        }
    }

    // Parse JSON files
    parseJSONFile(filePath) {
        try {
            console.log('📊 Reading JSON file:', filePath);

            const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            let members = [];

            if (Array.isArray(jsonData)) {
                // Direct array of members
                members = jsonData.map((memberData, index) => {
                    return this.createMemberFromJSONData(memberData, index);
                });
            } else if (jsonData.members && Array.isArray(jsonData.members)) {
                // Object with members array
                members = jsonData.members.map((memberData, index) => {
                    return this.createMemberFromJSONData(memberData, index);
                });
            } else if (jsonData.data && Array.isArray(jsonData.data)) {
                // Object with data array
                members = jsonData.data.map((memberData, index) => {
                    return this.createMemberFromJSONData(memberData, index);
                });
            } else {
                // Single member object
                members = [this.createMemberFromJSONData(jsonData, 0)];
            }

            console.log('✅ Successfully parsed', members.length, 'valid members from JSON');
            return members.filter(member => member.name && member.name.trim());

        } catch (error) {
            console.error('❌ Error parsing JSON file:', error);
            throw error;
        }
    }

    // Parse SQL files
    parseSQLFile(filePath) {
        try {
            console.log('📊 Reading SQL file:', filePath);

            const sqlContent = fs.readFileSync(filePath, 'utf8');
            const members = [];

            // Extract INSERT statements
            const insertRegex = /INSERT INTO\s+\w+\s*\([^)]+\)\s*VALUES\s*\([^)]+\)/gi;
            const matches = sqlContent.match(insertRegex);

            if (matches) {
                matches.forEach((insertStatement, index) => {
                    try {
                        const member = this.parseSQLInsertStatement(insertStatement, index);
                        if (member) {
                            members.push(member);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Failed to parse SQL statement ${index + 1}:`, error.message);
                    }
                });
            }

            console.log('✅ Successfully parsed', members.length, 'valid members from SQL');
            return members.filter(member => member.name && member.name.trim());

        } catch (error) {
            console.error('❌ Error parsing SQL file:', error);
            throw error;
        }
    }

    // Parse CSV files
    parseCSVFile(filePath) {
        try {
            console.log('📊 Reading CSV file:', filePath);

            const csvContent = fs.readFileSync(filePath, 'utf8');
            const lines = csvContent.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                throw new Error('CSV file must have at least a header row and one data row');
            }

            const headers = this.parseCSVLine(lines[0]);
            const dataRows = lines.slice(1).map(line => this.parseCSVLine(line));

            console.log('📋 Found headers:', headers);
            console.log('📊 Found', dataRows.length, 'member records');

            return this.mapRowsToMembers(headers, dataRows, 'csv');

        } catch (error) {
            console.error('❌ Error parsing CSV file:', error);
            throw error;
        }
    }

    // Helper function to parse CSV line
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    // Map rows to member objects
    mapRowsToMembers(headers, dataRows, source) {
        const customPrefix = this.multiseriesConfig?.enabled ? this.multiseriesConfig.prefix : 'VM';
        
        const members = dataRows.map((row, index) => {
            const member = {
                matrimonyId: this.generateMatrimonyId(index, customPrefix),
                rawIndex: index + 1,
                source: source,
                seriesConfig: this.multiseriesConfig
            };

            headers.forEach((header, colIndex) => {
                const value = row[colIndex] || '';
                const cleanValue = typeof value === 'string' ? value.trim() : value;

                if (!cleanValue || cleanValue === '-' || cleanValue === 'N/A') {
                    return;
                }

                this.mapFieldToMember(header, cleanValue, member);
            });

            return member;
        });

        return members.filter(member => member.name && member.name.trim());
    }

    // Map field to member object
    mapFieldToMember(header, value, member) {
        const headerLower = header.toLowerCase();

        if (headerLower.includes('gender') || headerLower.includes('பாலின')) {
            member.gender = value;
        } else if (headerLower.includes('name') || headerLower.includes('பெயர்')) {
            member.name = value;
        } else if (headerLower.includes('birth date') || headerLower.includes('பிறந்த தேதி')) {
            member.birthDate = value;
        } else if (headerLower.includes('birth time') || headerLower.includes('பிறந்த நேரம்')) {
            member.birthTime = value;
        } else if (headerLower.includes('birth place') || headerLower.includes('பிறந்த இடம்')) {
            member.birthPlace = value;
        } else if (headerLower.includes('age')) {
            member.age = value;
        } else if (headerLower.includes('caste') || headerLower.includes('ஜாதி')) {
            member.caste = value;
        } else if (headerLower.includes('gotra') || headerLower.includes('கோத்ரம்')) {
            member.gotra = value;
        } else if (headerLower.includes('rasi') || headerLower.includes('இராசி')) {
            member.rasi = value;
        } else if (headerLower.includes('star') || headerLower.includes('நட்சத்திரம்')) {
            member.star = value;
        } else if (headerLower.includes('height') || headerLower.includes('உயரம்')) {
            member.height = value;
        } else if (headerLower.includes('education') || headerLower.includes('கல்வி')) {
            member.education = value;
        } else if (headerLower.includes('job') || headerLower.includes('வேலை')) {
            member.job = value;
        } else if (headerLower.includes('income') || headerLower.includes('வருமானம்')) {
            member.monthlyIncome = value;
        } else if (headerLower.includes('father name') || headerLower.includes('தந்தை பெயர்')) {
            member.fatherName = value;
        } else if (headerLower.includes('father occupation') || headerLower.includes('தந்தை தொழில்')) {
            member.fatherOccupation = value;
        } else if (headerLower.includes('mother name') || headerLower.includes('தாய் பெயர்')) {
            member.motherName = value;
        } else if (headerLower.includes('mother occupation') || headerLower.includes('தாய் தொழில்')) {
            member.motherOccupation = value;
        } else if (headerLower.includes('siblings') || headerLower.includes('சகோதர')) {
            member.siblings = value;
        } else if (headerLower.includes('property') || headerLower.includes('சொத்து')) {
            member.property = value;
        } else if (headerLower.includes('address') || headerLower.includes('முகவரி')) {
            member.address = value;
        } else if (headerLower.includes('location') || headerLower.includes('இடம்')) {
            member.location = value;
        } else if (headerLower.includes('phone') || headerLower.includes('தொலைபேசி')) {
            member.phoneNumbers = value;
        } else if (headerLower.includes('expectation') || headerLower.includes('எதிர்பார்ப்பு')) {
            member.expectations = value;
        } else if (headerLower.includes('others') || headerLower.includes('மற்றவை')) {
            member.others = value;
        }
    }

    // Create member from XML data
    createMemberFromXMLData(memberData, index) {
        const customPrefix = this.multiseriesConfig?.enabled ? this.multiseriesConfig.prefix : 'VM';
        const member = {
            matrimonyId: this.generateMatrimonyId(index, customPrefix),
            rawIndex: index + 1,
            source: 'xml',
            seriesConfig: this.multiseriesConfig
        };

        // Map XML fields to member object
        Object.keys(memberData).forEach(key => {
            const value = typeof memberData[key] === 'object' ? memberData[key][0] : memberData[key];
            if (value && value !== '-' && value !== 'N/A') {
                this.mapFieldToMember(key, value, member);
            }
        });

        return member;
    }

    // Create member from JSON data
    createMemberFromJSONData(memberData, index) {
        const customPrefix = this.multiseriesConfig?.enabled ? this.multiseriesConfig.prefix : 'VM';
        const member = {
            matrimonyId: memberData.matrimonyId || this.generateMatrimonyId(index, customPrefix),
            rawIndex: index + 1,
            source: 'json',
            seriesConfig: this.multiseriesConfig
        };

        // Direct mapping for JSON data
        Object.keys(memberData).forEach(key => {
            const value = memberData[key];
            if (value && value !== '-' && value !== 'N/A' && key !== 'matrimonyId') {
                member[key] = value;
            }
        });

        return member;
    }

    // Create member from row data
    createMemberFromRow(headers, row, index) {
        const customPrefix = this.multiseriesConfig?.enabled ? this.multiseriesConfig.prefix : 'VM';
        const member = {
            matrimonyId: this.generateMatrimonyId(index, customPrefix),
            rawIndex: index + 1,
            seriesConfig: this.multiseriesConfig
        };

        headers.forEach((header, colIndex) => {
            const value = row[colIndex] || '';
            const cleanValue = typeof value === 'string' ? value.trim() : value;

            if (!cleanValue || cleanValue === '-' || cleanValue === 'N/A') {
                return;
            }

            this.mapFieldToMember(header, cleanValue, member);
        });

        return member;
    }

    // Parse SQL INSERT statement
    parseSQLInsertStatement(statement, index) {
        try {
            // Extract values from INSERT statement
            const valuesMatch = statement.match(/VALUES\s*\(([^)]+)\)/i);
            if (!valuesMatch) {
                throw new Error('Could not extract values from SQL statement');
            }

            const valuesString = valuesMatch[1];
            const values = this.parseSQLValues(valuesString);

            // Create basic member object
            const customPrefix = this.multiseriesConfig?.enabled ? this.multiseriesConfig.prefix : 'VM';
            const member = {
                matrimonyId: this.generateMatrimonyId(index, customPrefix),
                rawIndex: index + 1,
                source: 'sql',
                seriesConfig: this.multiseriesConfig
            };

            // Map common SQL column positions (adjust based on your SQL structure)
            if (values.length >= 3) {
                member.name = values[1] || '';
                member.age = values[2] || '';
                member.gender = values[3] || '';
                member.education = values[4] || '';
                member.job = values[5] || '';
                member.location = values[6] || '';
                member.phoneNumbers = values[7] || '';
            }

            return member;

        } catch (error) {
            console.warn('⚠️ Failed to parse SQL statement:', error.message);
            return null;
        }
    }

    // Parse SQL values string
    parseSQLValues(valuesString) {
        const values = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < valuesString.length; i++) {
            const char = valuesString[i];

            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = '';
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^['"]|['"]$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current.trim().replace(/^['"]|['"]$/g, ''));
        return values;
    }

    // Generate unique matrimony ID with custom series support and uniqueness validation
    generateMatrimonyId(index, customPrefix = 'VM') {
        // Set up tracking for unique IDs within this parsing session
        if (!this.generatedIds) {
            this.generatedIds = new Set();
        }

        let matrimonyId;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops

        do {
            // Generate 8-digit random number
            const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
            matrimonyId = `${customPrefix}${randomNumber}`;
            attempts++;
            
            if (attempts >= maxAttempts) {
                // Fallback: use timestamp + index if too many collisions
                const timestamp = Date.now().toString().slice(-6);
                const indexSuffix = String(index + 1).padStart(2, '0');
                matrimonyId = `${customPrefix}${timestamp}${indexSuffix}`;
                break;
            }
        } while (this.generatedIds.has(matrimonyId));

        // Track this ID as used
        this.generatedIds.add(matrimonyId);
        
        console.log(`🆔 Generated unique ID: ${matrimonyId} (attempts: ${attempts})`);
        return matrimonyId;
    }

    // Save parsed data to JSON file
    saveMembersToJSON(members, outputPath = 'members-data.json') {
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

    // Validate and normalize multiseries configuration
    validateMultiseriesConfig(multiseriesConfig) {
        // Default configuration
        const defaultConfig = {
            enabled: false,
            prefix: 'VM',
            description: 'Vevaha Matrimony'
        };

        // If no config provided, use default
        if (!multiseriesConfig) {
            console.log('📋 No multiseries config provided, using default VM prefix');
            return defaultConfig;
        }

        // If multiseries is disabled or no prefix, use default
        if (!multiseriesConfig.enabled || !multiseriesConfig.prefix || multiseriesConfig.prefix.trim() === '') {
            console.log('📋 Multiseries disabled or empty prefix, using default VM prefix');
            return defaultConfig;
        }

        // Validate and clean prefix
        let cleanPrefix = multiseriesConfig.prefix.trim().toUpperCase();
        
        // Remove any non-alphabetic characters and limit to 3 characters
        cleanPrefix = cleanPrefix.replace(/[^A-Z]/g, '').substring(0, 3);
        
        // If prefix becomes empty after cleaning, use default
        if (cleanPrefix === '') {
            console.log('⚠️ Invalid prefix after cleaning, using default VM prefix');
            return defaultConfig;
        }

        const validatedConfig = {
            enabled: true,
            prefix: cleanPrefix,
            description: multiseriesConfig.description || `Custom Series (${cleanPrefix})`
        };

        console.log(`✅ Validated multiseries config: ${cleanPrefix} - ${validatedConfig.description}`);
        return validatedConfig;
    }

    // Get file format
    getFileFormat(filePath) {
        return path.extname(filePath).toLowerCase();
    }

    // Validate file format
    isValidFormat(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        return this.supportedFormats.includes(extension);
    }

    // Load existing matrimony IDs to prevent duplicates across uploads
    loadExistingMatrimonyIds() {
        try {
            if (fs.existsSync('members-data.json')) {
                const existingData = fs.readFileSync('members-data.json', 'utf8');
                const existingMembers = JSON.parse(existingData);
                
                // Extract all existing matrimony IDs
                const existingIds = existingMembers
                    .map(member => member.matrimonyId)
                    .filter(id => id); // Remove null/undefined values
                
                // Initialize tracking set with existing IDs
                this.generatedIds = new Set(existingIds);
                console.log(`📋 Loaded ${existingIds.length} existing matrimony IDs to prevent duplicates`);
                
                return existingIds;
            }
        } catch (error) {
            console.warn('⚠️ Could not load existing matrimony IDs:', error.message);
        }
        
        // Initialize empty set if no existing data
        this.generatedIds = new Set();
        return [];
    }
}

module.exports = {
    UniversalFileParser
};