# Makefile for Terraform commands
.PHONY: help init plan apply destroy fmt validate clean

help:
	@echo "Billetera Digital - Terraform Commands"
	@echo "========================================"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@echo "  init       Initialize Terraform working directory"
	@echo "  validate   Validate Terraform configuration"
	@echo "  fmt        Format Terraform code"
	@echo "  plan       Review planned changes"
	@echo "  apply      Apply changes to AWS"
	@echo "  destroy    Destroy all AWS resources"
	@echo "  output     Display output values"
	@echo "  state      Show current state"
	@echo "  clean      Remove local Terraform files"
	@echo "  help       Show this help message"
	@echo ""

init:
	terraform init
	@echo "✓ Terraform initialized"

validate:
	terraform validate
	@echo "✓ Configuration is valid"

fmt:
	terraform fmt -recursive
	@echo "✓ Code formatted"

plan:
	terraform plan -out=tfplan
	@echo "✓ Plan saved to tfplan"

apply:
	terraform apply tfplan
	@echo "✓ Infrastructure applied"

apply-auto:
	terraform apply -auto-approve
	@echo "✓ Infrastructure applied (auto-approved)"

destroy:
	@echo "WARNING: This will delete all AWS resources!"
	@echo "Press Ctrl+C to cancel (5 seconds)..."
	@sleep 5
	terraform destroy
	@echo "✓ Infrastructure destroyed"

output:
	terraform output
	@echo ""
	@echo "To export environment variables:"
	@echo "  terraform output -json backend_environment_variables | jq -r 'to_entries[] | \"\\(.key)=\\(.value)\"' >> ../../src/backend/.env"

state:
	terraform state list

show:
	terraform state show

refresh:
	terraform refresh
	@echo "✓ State refreshed"

clean:
	rm -rf .terraform tfplan *.tfstate* .terraform.lock.hcl
	@echo "✓ Terraform files cleaned"

# Development workflow
dev: validate plan
	@echo "✓ Ready to apply changes"

# Production workflow  
prod: validate
	terraform plan -out=tfplan
	@echo "✓ Plan created: tfplan"
	@echo "Review with: terraform show tfplan"
	@echo "Apply with: terraform apply tfplan"

# Quick setup
setup: init validate plan
	@echo "✓ Setup complete"
	@echo "Next: Run 'make apply' to create resources"
