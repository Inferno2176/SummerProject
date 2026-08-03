from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        pass

    def footer(self):
        pass

pdf = PDF()
pdf.add_page()
pdf.set_font("Helvetica", size=12)

with open("sample_resume.txt", "r", encoding="utf-8") as f:
    for line in f:
        # replace problematic unicode characters if any
        line = line.encode('latin-1', 'replace').decode('latin-1')
        pdf.cell(0, 10, text=line.strip(), new_x="LMARGIN", new_y="NEXT")

pdf.output("sample_resume.pdf")
print("PDF generated successfully!")
