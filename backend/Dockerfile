FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    wget curl unzip tar git gcc libpq-dev ca-certificates \
    nmap perl sqlmap \
    && rm -rf /var/lib/apt/lists/*

# Nikto (Manual installation as it's missing from trixie-slim repo)
RUN git clone https://github.com/sullo/nikto /opt/nikto && \
    ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto

# XSStrike
RUN git clone https://github.com/s0md3v/XSStrike /opt/XSStrike
RUN pip install --no-cache-dir -r /opt/XSStrike/requirements.txt

# Commix
RUN git clone https://github.com/commixproject/commix /opt/commix

# jwt_tool
RUN git clone https://github.com/ticarpi/jwt_tool /opt/jwt_tool
RUN pip install --no-cache-dir termcolor cprint pycryptodomex

# Install Nuclei — dynamic latest via GitHub redirect
RUN NUCLEI_VERSION=$(curl -s https://api.github.com/repos/projectdiscovery/nuclei/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/') \
    && wget -q "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_amd64.zip" \
    && unzip nuclei_${NUCLEI_VERSION}_linux_amd64.zip nuclei \
    && mv nuclei /usr/local/bin/ \
    && rm nuclei_${NUCLEI_VERSION}_linux_amd64.zip

# Install Gitleaks — dynamic latest
RUN GITLEAKS_VERSION=$(curl -s https://api.github.com/repos/gitleaks/gitleaks/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/') \
    && wget -q "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
    && tar -xzf gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz gitleaks \
    && mv gitleaks /usr/local/bin/ \
    && rm gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz

# Install Trivy — dynamic latest
RUN TRIVY_VERSION=$(curl -s https://api.github.com/repos/aquasecurity/trivy/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/') \
    && wget -q "https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz" \
    && tar -xzf trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz trivy \
    && mv trivy /usr/local/bin/ \
    && rm trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz

# Install FFUF — dynamic latest
RUN FFUF_VERSION=$(curl -s https://api.github.com/repos/ffuf/ffuf/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/') \
    && wget -q "https://github.com/ffuf/ffuf/releases/download/v${FFUF_VERSION}/ffuf_${FFUF_VERSION}_linux_amd64.tar.gz" \
    && tar -xzf ffuf_${FFUF_VERSION}_linux_amd64.tar.gz ffuf \
    && mv ffuf /usr/local/bin/ \
    && rm ffuf_${FFUF_VERSION}_linux_amd64.tar.gz

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt trufflehog3

COPY . .
