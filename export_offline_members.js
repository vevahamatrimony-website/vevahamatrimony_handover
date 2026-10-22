require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function exportOfflineMembers() {
    console.log('Fetching all offline members from Supabase...');
    
    // Fetch all records from offline_members
    let allMembers = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
        const { data, error } = await sb
            .from('offline_members')
            .select('id, member_id, full_name, phone, whatsapp')
            .order('id', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching offline members:', error);
            return;
        }

        if (!data || data.length === 0) break;
        allMembers = allMembers.concat(data);
        if (data.length < pageSize) break;
        page++;
    }

    console.log(`Retrieved ${allMembers.length} offline members.`);

    // Map data to requested columns: ID, Member ID, Name, Mobile Number
    const exportData = allMembers.map((m, index) => {
        const mobile = (m.phone || m.whatsapp || '').trim() || '-';
        return {
            'S.No': index + 1,
            'ID': m.id,
            'Member ID': m.member_id || '-',
            'Name': m.full_name || '-',
            'Mobile Number': mobile
        };
    });

    // Create XLSX workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-fit column widths
    const colWidths = [
        { wch: 6 },  // S.No
        { wch: 10 }, // ID
        { wch: 16 }, // Member ID
        { wch: 30 }, // Name
        { wch: 25 }  // Mobile Number
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Offline Members');

    const xlsxFilePath = path.join(__dirname, 'offline_members.xlsx');
    const csvFilePath = path.join(__dirname, 'offline_members.csv');

    // Write files
    XLSX.writeFile(workbook, xlsxFilePath);
    XLSX.writeFile(workbook, csvFilePath, { bookType: 'csv' });

    console.log(`\n✅ Excel file successfully created: ${xlsxFilePath}`);
    console.log(`✅ CSV file successfully created: ${csvFilePath}`);
    console.log(`Total Records Exported: ${exportData.length}`);
}

exportOfflineMembers();
