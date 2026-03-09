import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

@Injectable()
export class AccountsService {
    private readonly BILLS_ROOT = path.join(process.cwd(), 'data', 'bills');

    constructor() {
        this.ensureDirectory(this.BILLS_ROOT);
    }

    private ensureDirectory(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    async uploadBills(month: string, year: string, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('ZIP file is required');
        }

        const monthDir = path.join(this.BILLS_ROOT, year, month);

        // 1. Delete previous folder if it exists
        if (fs.existsSync(monthDir)) {
            fs.rmSync(monthDir, { recursive: true, force: true });
        }

        this.ensureDirectory(monthDir);

        // 2. Extract ZIP
        try {
            const zip = new AdmZip(file.buffer);
            zip.extractAllTo(monthDir, true);

            // Optional: Clean up non-PDF files or validate naming if needed
            // For now, assume ZIP contains the correct files as per requirement.

            return {
                message: `Bills for ${month}/${year} uploaded and extracted successfully`,
                count: zip.getEntries().length,
            };
        } catch (error) {
            throw new BadRequestException('Failed to extract ZIP file: ' + error.message);
        }
    }

    async getBills(membershipNo: string, month?: string, year?: string) {
        if (month && year) {
            const filePath = path.join(this.BILLS_ROOT, year, month, `${membershipNo}_bill.pdf`);
            if (fs.existsSync(filePath)) {
                return {
                    url: `/bills/${year}/${month}/${membershipNo}_bill.pdf`,
                    month,
                    year,
                };
            }
            throw new NotFoundException(`Bill for ${month}/${year} not found`);
        }

        return this.getLatestBill(membershipNo);
    }

    async getLatestBill(membershipNo: string) {
        // Scan years descending
        const years = fs.readdirSync(this.BILLS_ROOT)
            .filter(f => fs.statSync(path.join(this.BILLS_ROOT, f)).isDirectory())
            .sort((a, b) => Number(b) - Number(a));

        for (const year of years) {
            const yearDir = path.join(this.BILLS_ROOT, year);
            // Scan months descending
            const months = fs.readdirSync(yearDir)
                .filter(f => fs.statSync(path.join(yearDir, f)).isDirectory())
                .sort((a, b) => Number(b) - Number(a)); // Assuming months are numeric strings or can be sorted lexicographically if "January" etc (user didn't specify format)
            // If months are "01", "02" etc., numeric sort works. 
            // If they are names, we might need a map. Let's assume numeric or lexicographical for now.

            for (const month of months) {
                const filePath = path.join(yearDir, month, `${membershipNo}_bill.pdf`);
                if (fs.existsSync(filePath)) {
                    return {
                        url: `/bills/${year}/${month}/${membershipNo}_bill.pdf`,
                        month,
                        year,
                    };
                }
            }
        }

        throw new NotFoundException('No bills found for this member');
    }

    async listBills(month: string, year: string) {
        const monthDir = path.join(this.BILLS_ROOT, year, month);

        if (!fs.existsSync(monthDir)) {
            return [];
        }

        const files = fs.readdirSync(monthDir)
            .filter(file => file.endsWith('.pdf'))
            .map(file => {
                const membershipNo = file.split('_')[0];
                return {
                    filename: file,
                    membershipNo,
                    url: `/bills/${year}/${month}/${file}`,
                };
            });

        return files;
    }
}
